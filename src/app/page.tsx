import { redirect } from "next/navigation";

// Landing: hand off to the app. Middleware bounces anonymous users from /dashboard to /login.
export default function Home() {
  redirect("/dashboard");
}
