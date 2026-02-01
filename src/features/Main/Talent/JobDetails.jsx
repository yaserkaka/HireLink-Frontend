/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */

import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useParams } from "react-router-dom";
import InfoItem from "../../../components/UI/InfoItem";
import Loading from "../../../components/UI/Loading";
import { prettyEnum } from "../../../utils/formatter";
import { formatName } from "../../../utils/tools";
import { useTalentJobQuery } from "./profile/hooks/queries/useTalentJobQuery";
import { useTalentMyAppQuery } from "./profile/hooks/queries/useTalentMyAppQuery";

/**
 * JobDetails component displays the details of a job
 * It fetches the job data using the useQuery hook from @tanstack/react-query
 * It also fetches the user's applications for the job using the useQuery hook
 * If the job is not found, it renders a "Job not found" message
 * If the job is found, it renders the job details, including the title, description, payment type, budget, work arrangement, experience level, location, responsibilities, and skills
 * If the user has already applied for the job, it renders the application status and read-only details
 * If the user has not already applied for the job, it renders an "Apply Now" button
 */
export default function JobDetails() {
	const { id: jobId } = useParams();
	const navigate = useNavigate();

	const {
		data: jobRes,
		isLoading: jobLoading,
		isError: jobIsError,
		error: jobError,
	} = useTalentJobQuery(jobId);

	// Job extraction

	const {
		data: appsRes,
		isLoading: appsLoading,
		isError: appsIsError,
		error: appsError,
		isFetching: appsFetching,
	} = useTalentMyAppQuery();
	const job = jobRes?.data?.data ?? jobRes?.data ?? null;

	// Applications extraction
	const applications = appsRes?.data?.data ?? appsRes?.data ?? [];

	// Find my application for this job
	// Using useMemo to avoid unnecessary re-renders
	const myAppForThisJob = useMemo(() => {
		if (!Array.isArray(applications)) return null;
		return applications.find((a) => a.jobId === jobId) || null;
	}, [applications, jobId]);

	const alreadyApplied = !!myAppForThisJob;

	// Loading / Error states
	if (jobLoading || appsLoading) return <Loading />;

	if (jobIsError) {
		return (
			<div className="px-10 py-10 text-red-600">
				{jobError?.message || "Failed to load job."}
			</div>
		);
	}

	if (appsIsError) {
		return (
			<div className="px-10 py-10 text-red-600">
				{appsError?.message || "Failed to load your applications."}
			</div>
		);
	}

	if (!job) return <div className="px-10 py-10">Job not found</div>;

	// Derived UI values

	const budget =
		job.salary ?? (job.hoursPerWeek ? `${job.hoursPerWeek} hrs/week` : null);
	const workArrangement = prettyEnum(job.jobType);
	const experienceLevel = prettyEnum(job.experienceLevel);
	const location = job.location;

	const responsibilities = Array.isArray(job.responsibilities)
		? job.responsibilities
		: [];

	return (
		<>
			<Helmet>
				<title>{job.title}</title>
			</Helmet>
			<div className="px-10 py-10">
				{/* Back */}
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="text-purple-600 hover:underline mb-6"
				>
					← Back to Jobs
				</button>

				{/* MAIN CARD */}
				<div className="bg-white mx-auto max-w-4xl p-10 rounded-2xl shadow-sm border">
					{/* TITLE */}
					<div className="flex items-start justify-between gap-4">
						<div>
							{/* job title . company name */}
							<h3 className="text-xl font-semibold mb-3">
								{job.title} .{" "}
								<span className="text-lg font-sans font-thin text-gray-600 mb-2">
									{job?.employer?.companyName}
								</span>
							</h3>
							<p className="text-gray-600 leading-relaxed mb-8">
								{job.description}
							</p>
						</div>

						{/* Heart placeholder */}
						<button
							type="button"
							className="text-gray-400 hover:text-purple-600"
						>
							♡
						</button>
					</div>

					{/* INFO ROW */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
						<InfoItem value={budget} label="Budget" />
						<InfoItem value={workArrangement} label="Work Arrangement" />
						<InfoItem value={experienceLevel} label="Experience Level" />
						<InfoItem value={location} label="Location" />
					</div>

					{/* RESPONSIBILITIES */}
					<h2 className="text-xl font-semibold mb-2">Responsibilities:</h2>
					{responsibilities.length > 0 ? (
						<ul className="list-disc ml-6 space-y-1 mb-8 text-gray-700">
							{responsibilities.map((item, idx) => (
								<li key={`${jobId}-resp-${idx}`}>{item}</li>
							))}
						</ul>
					) : (
						<p className="text-gray-500 mb-8">No responsibilities listed.</p>
					)}

					{/* SKILLS */}
					{Array.isArray(job?.requiredSkills) &&
					job?.requiredSkills?.length > 0 ? (
						<>
							<h4 className="text-lg font-semibold mb-3 mt-3">Skills</h4>
							<div className="flex flex-wrap gap-2">
								{job?.requiredSkills?.map((skill, i) => (
									<span
										key={`${jobId}-skill-${i}`}
										className="px-3 py-1 text-sm bg-gray-100 rounded-full"
									>
										{skill.name}
									</span>
								))}
							</div>
						</>
					) : null}

					{/* Languages */}
					{Array.isArray(job?.requiredLanguages) &&
					job?.requiredLanguages?.length > 0 ? (
						<>
							<h4 className="text-lg font-semibold mb-2 mt-6">
								Required Languages{" "}
							</h4>
							<div className="flex flex-wrap gap-2 mb-3">
								{job?.requiredLanguages?.map((lang, i) => (
									<span
										key={`${jobId}-lang-${i}`}
										className="px-3 py-1 text-sm bg-gray-100 rounded-full"
									>
										{lang.name} . {formatName(lang.minimumProficiency)}
									</span>
								))}
							</div>
						</>
					) : null}

					{/* Apply Button */}
					{alreadyApplied && (
						<>
							<div className="mb-6 p-4 rounded-xl border bg-yellow-50 text-yellow-800">
								You already applied for this job.
								<div className="mt-2 font-semibold">
									Status: {String(myAppForThisJob.status).replaceAll("_", " ")}
									{appsFetching ? (
										<span className="ml-2 text-xs text-gray-500">
											(refreshing...)
										</span>
									) : null}
								</div>
							</div>

							<div className="mb-8 p-6 rounded-2xl border bg-white">
								<h3 className="text-lg font-semibold mb-4">Your Application</h3>

								<div className="mb-4">
									<p className="text-sm text-gray-500">Cover Letter</p>
									<p className="text-gray-800 whitespace-pre-wrap">
										{myAppForThisJob.coverLetter || "—"}
									</p>
								</div>

								<div className="mb-2">
									<p className="text-sm text-gray-500">Resume</p>
									{myAppForThisJob.resumeUrl ? (
										<a
											href={myAppForThisJob.resumeUrl}
											target="_blank"
											rel="noreferrer"
											className="text-purple-600 hover:underline"
										>
											View resume
										</a>
									) : (
										<p className="text-gray-800">—</p>
									)}
								</div>

								<p className="text-xs text-gray-500 mt-4">
									Applied on{" "}
									{new Date(myAppForThisJob.createdAt).toLocaleString()}
								</p>
							</div>
						</>
					)}

					{/* APPLY BUTTON  disabled={alreadyApplied} */}
					{!alreadyApplied && (
						<div className="text-center">
							<Link
								to={`/talent/jobs/${jobId}/apply`}
								className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 duration-200 inline-block"
							>
								Apply Now
							</Link>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
