import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "./app";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(true).toBe(true);
  });
});
