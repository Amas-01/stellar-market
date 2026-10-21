/**
 * Covers #1616: queued actions refused because the session expired are
 * surfaced to the user rather than lost silently.
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import OfflineBanner from "../OfflineBanner";
import type { OfflineStatus } from "@/hooks/useOfflineStatus";

let mockStatus: OfflineStatus;
jest.mock("@/hooks/useOfflineStatus", () => ({ useOfflineStatus: () => mockStatus }));
jest.mock("next/link", () => ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>);

describe("OfflineBanner", () => {
  it("asks the user to sign in again when queued actions need re-login", () => {
    mockStatus = { isOnline: true, hasPendingSync: true, needsReauth: true };
    render(<OfflineBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t be sent because your session expired/i);
    expect(screen.getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByText("Syncing pending changes...")).not.toBeInTheDocument();
  });

  it("still shows the offline notice first", () => {
    mockStatus = { isOnline: false, hasPendingSync: true, needsReauth: true };
    render(<OfflineBanner />);

    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it("renders nothing when online with nothing queued", () => {
    mockStatus = { isOnline: true, hasPendingSync: false, needsReauth: false };
    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
