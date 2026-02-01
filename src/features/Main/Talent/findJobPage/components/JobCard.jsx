import { Link } from "react-router-dom";
import Chip from "../../../../../components/UI/Chip";

/**
 * JobCard
 * Dedicated component keeps JobList clean and readable.
 */
export default function JobCard({ job, showMatch }) {
	return (
		<Link to={`/talent/jobs/${job.id}`}>
			<div className="bg-white p-6 mb-6 rounded-l shadow-sm border hover:shadow-md cursor-pointer">
				<div className="flex flex-wrap gap-2 mb-4">
					{/* Only render chips when data exists (avoid empty Chip) */}
					{job.hoursPerWeek ? (
						<Chip>{`${job.hoursPerWeek} hrs/week`}</Chip>
					) : null}

					{job.salary != null ? <Chip>{job.salary}</Chip> : null}
					{job.location ? <Chip>{job.location}</Chip> : null}
					{job.experienceLevel ? <Chip>{job.experienceLevel}</Chip> : null}

					{/* If backend returns a match score, show it only on Best Matches tab */}
					{showMatch && job.matchScore != null ? (
						<Chip>{`Match: ${job.matchScore}`}</Chip>
					) : null}
				</div>

				<h2 className="text-black font-semibold mb-2 py-2">
					{job.title || "Untitled job"}
				</h2>

				<p className="text-gray-600 mb-2">
					{job.description || job.desc || ""}
				</p>

				{/* tags */}
				{Array.isArray(job.tags) && job.tags.length > 0 ? (
					<div className="flex flex-wrap gap-2 mt-3">
						{job.tags.map((tag, i) => (
							<span
								key={`${job.id}-tag-${i}`}
								className="px-3 py-1 text-black bg-gray-100 rounded-full"
							>
								{tag}
							</span>
						))}
					</div>
				) : null}
			</div>
		</Link>
	);
}
