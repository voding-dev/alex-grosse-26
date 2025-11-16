import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Publish scheduled blog posts every minute
crons.interval(
  "publish scheduled blog posts",
  { minutes: 1 },
  internal.blogPosts.publishScheduledPosts
);

export default crons;

