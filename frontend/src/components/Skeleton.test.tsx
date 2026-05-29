import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton, ShowcaseGridSkeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("aplica width/height y es aria-hidden", () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);
    const el = container.querySelector(".skeleton");
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ width: "50%", height: "2rem" });
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("ShowcaseGridSkeleton renderiza N tarjetas-fantasma", () => {
    const { container } = render(<ShowcaseGridSkeleton count={5} />);
    expect(container.querySelectorAll(".skeleton-card")).toHaveLength(5);
  });
});
