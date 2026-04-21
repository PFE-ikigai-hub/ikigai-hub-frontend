import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

type Options = {
  route?: string;
};

export function renderWithRouter(ui: ReactElement, options: Options = {}) {
  const { route = "/" } = options;
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
