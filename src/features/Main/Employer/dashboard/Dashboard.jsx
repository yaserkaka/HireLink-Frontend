import { Briefcase, Layers, Pencil, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useSearchParams } from "react-router-dom";
import headerImage from "../../../../assets/images/layouts/header.svg";
import Loading from "../../../../components/UI/Loading";
import { useAuth } from "../../../../hooks/useAuth";
import { useDeleteEmployerJob } from "../hooks/mutations/useDeleteEmployerJob";
import { useEmployerJobsQuery } from "../hooks/queries/useEmployerJobsQuery";
import ApplicationDetailsModal from "./components/ApplicationDetailsModal";
import JobApplicationsModal from "./components/JobApplicationModal";

// const PAGE_SIZE = 10;

function StatCard({ icon: Icon, label, value }) {
	return (
		<div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
			<div className="w-14 h-14 rounded-2xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center">
				<Icon className="w-6 h-6" />
			</div>
			<div>
				<div className="text-2xl font-bold text-gray-900 leading-none">
					{value ?? "—"}
				</div>
				<div className="text-sm text-gray-500 mt-1">{label}</div>
			</div>
		</div>
	);
}

function TableShell({ title, onSeeMore, children }) {
	return (
		<section className="bg-white rounded-2xl border shadow-sm">
			<div className="p-5 flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900">{title}</h2>

				{onSeeMore ? (
					<button
						type="button"
						onClick={onSeeMore}
						className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800"
					>
						See more →
					</button>
				) : null}
			</div>
			<div className="px-5 pb-5">{children}</div>
		</section>
	);
}

export default function EmployerDashboard() {
	const { isAuthReady, currentUser } = useAuth();

	const [searchParams] = useSearchParams();
	const qFromUrl = searchParams.get("q") ?? "";
	const q = qFromUrl.trim();
	/* -------------------- router & mutations -------------------- */
	const navigate = useNavigate();
	const delJob = useDeleteEmployerJob();
	const [appModalOpen, setAppModalOpen] = useState(false);
	const [selectedAppId, setSelectedAppId] = useState(null);
	const [selectedAppSeed, setSelectedAppSeed] = useState(null);

	const [showAllJobs, setShowAllJobs] = useState(false);

	const openAppDetails = (appRow) => {
		setSelectedAppId(appRow.id);
		setSelectedAppSeed(appRow); // لو معاك talent info من recent apps
		setAppModalOpen(true);
	};

	const closeAppDetails = () => {
		setAppModalOpen(false);
		setSelectedAppId(null);
		setSelectedAppSeed(null);
	};

	const [appsModalOpen, setAppsModalOpen] = useState(false);
	const [selectedJobForApps, setSelectedJobForApps] = useState(null);

	const openJobApps = (job) => {
		setSelectedJobForApps(job);
		setAppsModalOpen(true);
	};

	const closeJobApps = () => {
		setAppsModalOpen(false);
		setSelectedJobForApps(null);
	};

	/* -------------------- Jobs & Recent Applications queries -------------------- */
	const jobsQ = useEmployerJobsQuery();

	const jobs = useMemo(() => {
		const raw = jobsQ?.data?.data ?? jobsQ?.data ?? [];
		return Array.isArray(raw) ? raw : [];
	}, [jobsQ]);

	const allJobs = jobs;

	// Frontend search filtering
	const filteredAllJobs = useMemo(() => {
		const s = q.toLowerCase();
		if (!s) return allJobs;

		return allJobs.filter((job) => {
			const title = (job.title ?? "").toLowerCase();
			const createdAt = job.createdAt
				? new Date(job.createdAt).toLocaleDateString().toLowerCase()
				: "";
			// لو عندك location أو description في job ضيفيهم هنا
			// const location = (job.location ?? "").toLowerCase();

			return title.includes(s) || createdAt.includes(s);
		});
	}, [allJobs, q]);

	// 2) see more يطبق على نتائج الفلترة
	const filteredVisibleJobs = useMemo(() => {
		return showAllJobs ? filteredAllJobs : filteredAllJobs.slice(0, 5);
	}, [filteredAllJobs, showAllJobs]);
	const emptyText = q ? `No jobs match "${q}".` : "No jobs yet.";

	/* -------------------- Loading / Error -------------------- */
	const isLoading = jobsQ.isLoading;
	const isError = jobsQ.isError;
	const error = jobsQ.error;
	const isFetching = jobsQ.isFetching;
	const res = jobsQ.data;

	// render loading state
	const hasData = Boolean(res?.data);
	if ((isLoading || isFetching) && !hasData) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<Loading />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-6 text-red-600">
				Failed to load jobs: {error?.message || "Something went wrong"}
			</div>
		);
	}

	/* -------------------- Derived data (NO N+1) -------------------- */

	const stats = {
		totalJobs: allJobs.length,
		activeOpenJobs: allJobs.filter(
			(j) => String(j?.jobStatus || "").toUpperCase() === "OPEN",
		).length,
		totalApplications: null, // intentionally null to avoid N+1
	};
	if (!isAuthReady) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<Loading />
			</div>
		);
	}

	/* -------------------- UI -------------------- */
	return (
		<>
			<Helmet>Dashbard</Helmet>
			<div className="min-h-screen bg-gray-50 p-4">
				{/* -------------------- Stats -------------------- */}
				<div
					className="h-58 w-full bg-cover bg-center flex mx-auto mb-10"
					style={{ backgroundImage: `url(${headerImage})` }}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mx-auto py-10">
						<StatCard
							icon={Layers}
							label="Total Jobs"
							value={stats.totalJobs}
						/>
						<StatCard
							icon={Briefcase}
							label="Active (Open) Jobs"
							value={stats.activeOpenJobs}
						/>
						<StatCard
							icon={Users}
							label="Applications Received"
							value={stats.totalApplications ?? "—"}
						/>
					</div>
				</div>

				<div className="max-w-6xl mx-auto space-y-6">
					{/* -------------------- see more button --------------- */}
					<div className="flex items-center justify-between mb-3">
						<div className="text-sm text-gray-500">
							Showing{" "}
							{/* <span className="font-semibold">{visibleJobs.length}</span> of{" "}
							<span className="font-semibold">{allJobs.length}</span> jobs */}
							<span className="font-semibold">
								{filteredVisibleJobs.length}
							</span>{" "}
							of <span className="font-semibold">{filteredAllJobs.length}</span>
						</div>

						{filteredAllJobs.length > 5 ? (
							<button
								type="button"
								onClick={() => setShowAllJobs((v) => !v)}
								className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800"
							>
								{showAllJobs ? "Show less ←" : "See more →"}
							</button>
						) : null}
					</div>

					{/* -------------------- Job Summary -------------------- */}
					<TableShell title="Job Summary Table">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-gray-500 border-b">
										<th className="py-3 pr-3">Job Title</th>
										<th className="py-3 pr-3">Posted On</th>
										<th className="py-3 pr-3">Applications</th>
										<th className="py-3 pr-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredVisibleJobs.length === 0 ? (
										<tr>
											<td
												colSpan={5}
												className="py-8 text-center text-gray-500"
											>
												{emptyText}
											</td>
										</tr>
									) : (
										filteredVisibleJobs.map((job) => (
											<tr key={job.id} className="border-b last:border-b-0">
												<td className="py-4 pr-3 font-medium text-gray-900">
													{job.title}
												</td>
												<td className="py-4 pr-3 text-gray-600">
													{new Date(job.createdAt).toLocaleDateString()}
												</td>

												<td className="py-4 pr-3 text-gray-700">
													<button
														type="button"
														className="text-fuchsia-700 hover:text-fuchsia-800 font-medium"
														onClick={() => openJobApps(job)}
													>
														Open →
													</button>
												</td>
												<td className="py-4 pr-3">
													<div className="flex justify-end gap-3">
														<button
															type="button"
															className="text-blue-600 hover:text-blue-800"
															onClick={() =>
																navigate(`/employer/jobs/${job.id}/edit`)
															}
														>
															<Pencil className="w-4 h-4" />
														</button>
														<button
															type="button"
															className="text-red-600 hover:text-red-800"
															disabled={delJob.isLoading}
															onClick={() => {
																if (!window.confirm("Delete this job?")) return;
																delJob.mutate(job.id);
															}}
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</TableShell>
					<ApplicationDetailsModal
						open={appModalOpen}
						onClose={closeAppDetails}
						seed={selectedAppSeed}
					/>

					<JobApplicationsModal
						open={appsModalOpen}
						onClose={closeJobApps}
						job={selectedJobForApps}
						onOpenApplication={(app, job) => {
							closeJobApps();
							openAppDetails({
								...app,
								jobTitle: job.title,
							});
						}}
					/>
				</div>
			</div>
		</>
	);
}
