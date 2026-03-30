import type { JobStatus } from "@/types";

/**
 * In-memory job store for MVP.
 * Replace with Redis/BullMQ for production.
 */

interface Job {
  id: string;
  status: JobStatus;
  videoUrl?: string;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, Job>();

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: "processing",
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(
  id: string,
  update: Partial<Pick<Job, "status" | "videoUrl" | "error">>
): void {
  const job = jobs.get(id);
  if (job) {
    Object.assign(job, update);
  }
}

export function generateJobId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
