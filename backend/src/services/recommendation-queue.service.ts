import { Queue, Worker } from "bullmq";
import RedisClient from "../lib/redis";
import { RecommendationService } from "./recommendation.service";
import { logger } from "../lib/logger";

const connection = RedisClient.getInstance();

export type RecommendationRebuildJob = {
  jobId: string;
};

let queue: Queue<RecommendationRebuildJob> | null = null;
let worker: Worker<RecommendationRebuildJob> | null = null;

function getQueue(): Queue<RecommendationRebuildJob> {
  if (!queue) {
    queue = new Queue<RecommendationRebuildJob>("recommendation-rebuild", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: false,
      },
    });
  }
  return queue;
}

export function getRecommendationRebuildQueue(): Queue<RecommendationRebuildJob> {
  return getQueue();
}

function startRecommendationWorker(): void {
  if (worker) return;

  worker = new Worker<RecommendationRebuildJob>(
    "recommendation-rebuild",
    async (job) => {
      await RecommendationService.rebuildRecommendationsForJob(job.data.jobId);
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    if (job) {
      logger.error(
        { jobId: job.id, jobData: job.data, err },
        "Recommendation rebuild job failed after all retries",
      );
    }
  });

    const redis = getQueueConnection();

    for (;;) {
      const rawJob = await redis.lpop(RECOMMENDATION_REBUILD_QUEUE_KEY);
      if (!rawJob) {
        break;
      }

      try {
        const payload = JSON.parse(rawJob) as RecommendationRebuildJob;
        await RecommendationService.rebuildRecommendationsForJob(payload.jobId);
      } catch (error) {
        logger.error({ err: error }, "Failed to process recommendation rebuild job");
      }
    }
  } catch (error) {
    logger.warn({ err: error }, "Recommendation rebuild worker is unavailable");
  } finally {
    workerRunning = false;
  }
}

export class RecommendationQueueService {
  static async enqueueRebuild(jobId: string): Promise<void> {
    await getQueue().add("rebuild", { jobId });
  }

  static startWorker(): void {
    startRecommendationWorker();
  }

  static async stopWorker(): Promise<void> {
    if (worker) {
      await worker.close();
      worker = null;
    }
  }
}
