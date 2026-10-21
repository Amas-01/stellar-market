import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import ServiceDetailPage from "../page";

jest.mock("axios");
const mockAxios = axios as jest.Mocked<typeof axios>;

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "service-1" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock("@/components/ShareMenu", () => () => null);
jest.mock("@/components/Avatar", () => () => null);

function makeService(averageRating: number | null) {
  return {
    id: "service-1",
    title: "Test Service",
    description: "desc",
    category: "Dev",
    price: 100,
    deliveryDays: 7,
    createdAt: new Date().toISOString(),
    tags: [],
    images: [],
    skills: [],
    freelancer: {
      id: "fl-1",
      name: "Alice",
      avatarUrl: null,
      averageRating,
      reviewCount: 3,
      stellarAddress: null,
      skills: [],
      completedJobs: 0,
      memberSince: new Date().toISOString(),
    },
  };
}

describe("ServiceDetailPage rating display (#1623)", () => {
  it("formats a long decimal rating to one decimal place", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: makeService(4.666666666666667) });
    render(<ServiceDetailPage />);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.queryByText("4.666666666666667")).not.toBeInTheDocument();
  });

  it("renders an exact integer rating with one decimal place (e.g. 5 → 5.0)", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: makeService(5) });
    render(<ServiceDetailPage />);
    await waitFor(() => expect(screen.getByText("5.0")).toBeInTheDocument());
  });

  it("renders a zero rating as 0.0, not blank", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: makeService(0) });
    render(<ServiceDetailPage />);
    await waitFor(() => expect(screen.getByText("0.0")).toBeInTheDocument());
  });

  it("renders a null rating as 0.0 (fallback)", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: makeService(null) });
    render(<ServiceDetailPage />);
    await waitFor(() => expect(screen.getByText("0.0")).toBeInTheDocument());
  });
});
