import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
});

function Index() {
  return <App />;
}
