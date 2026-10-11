type JobWithCities = {
  location_city?: string | null;
  location_cities?: string[] | null;
};

/** Every city a job is at, in the order added. Older responses carry only the first. */
export const jobCities = (job: JobWithCities): string[] =>
  job.location_cities?.length ? job.location_cities : job.location_city ? [job.location_city] : [];

/** "Pune, Delhi" for a list column; empty when the job has no location. */
export const citiesText = (job: JobWithCities): string => jobCities(job).join(', ');
