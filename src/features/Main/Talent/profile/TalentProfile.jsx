import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Badge from "../../../../components/UI/Badge";
import CardOverlay from "../../../../components/UI/CardLoader";
import Chip from "../../../../components/UI/Chip";
import Loading from "../../../../components/UI/Loading";
import PencilIcon from "../../../../components/UI/PencilIcon";
import Saving from "../../../../components/UI/Saving";
import { useTalentProfileQuery } from "../../../../hooks/queries/talent/useTalentProfile";
import { useAuth } from "../../../../hooks/useAuth";
import { queryKeys } from "../../../../lib/queryKeys";
import {
	removeTalentCertificaties,
	removeTalentLanguage,
	removeTalentSkill,
	updateTalentProfile,
	upSertTalentCertificaties,
	upSertTalentLanguage,
	upSertTalentSkill,
} from "../../../../services/talent.service";
import { buildAvatarUrl } from "../../../../utils/Helpers/avatar";
import { buildCloudinaryUrl } from "../../../../utils/Helpers/cloudinary";
import { calcProfileCompletion } from "../../../../utils/Helpers/profileCompletion";
import ProfileHeaderCard from "./components/ProfileHeaderCard";
import ResumeCard from "./components/ResumeCard";
import {
	useDeleteTalentResumeMutation,
	useTalentResumeQuery,
	useUploadTalentResumeMutation,
} from "./hooks/mutations/useTalentResume";

export function Modal({ open, title, onClose, children, footer }) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center">
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
				aria-label="Close"
			/>
			<div className="relative z-10 bg-white rounded-2xl shadow-xl w-[92%] max-w-2xl border">
				<div className="p-5 border-b flex items-center justify-between">
					<h3 className="font-bold text-slate-900">{title}</h3>
					<button
						type="button"
						className="px-3 py-1 rounded-xl border hover:bg-slate-50 text-sm font-semibold"
						onClick={onClose}
					>
						Close
					</button>
				</div>

				<div className="p-5">{children}</div>

				{footer ? <div className="p-5 border-t">{footer}</div> : null}
			</div>
		</div>
	);
}

export default function TalentProfilePage() {
	const { isAuthReady } = useAuth();

	// get profile data from get/talent profile return data
	const { data, isLoading, isFetching, isError, error } =
		useTalentProfileQuery();

	// get profile data from  data
	const profile = data?.data?.talentProfile;

	//cert Modal state
	const [certModalOpen, setCertModalOpen] = useState(false);
	const [editingCert, setEditingCert] = useState(null);

	const [certDraft, setCertDraft] = useState({
		name: "",
		issuer: "",
		credentialId: "",
		credentialUrl: "",
		issueDate: "",
		expiryDate: "",
	});

	const qc = useQueryClient();
	// upsert cert mutation
	const upsertCertM = useMutation({
		mutationFn: upSertTalentCertificaties,
		onSuccess: async (res) => {
			if (res?.ok === false) throw new Error(res?.message);
			await qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
			toast.success(editingCert ? "Certificate updated" : "Certificate added");
			closeCertModal();
		},
		onError: (e) => toast.error(e?.message || "Operation failed"),
	});

	// delete cert
	const deleteCertM = useMutation({
		mutationFn: (certificateId) => removeTalentCertificaties({ certificateId }),
		onSuccess: (res, certificateId) => {
			if (res?.ok === false) throw new Error(res?.message || "Delete failed");

			qc.setQueryData(queryKeys.talentProfile, (prev) => {
				if (!prev?.data?.talentProfile) return prev;

				return {
					...prev,
					data: {
						...prev.data,
						talentProfile: {
							...prev.data.talentProfile,
							certificates: (prev.data.talentProfile.certificates || []).filter(
								(cert) => cert.certificateId !== certificateId,
							),
						},
					},
				};
			});

			toast.success("Certificate deleted");
		},
		onError: (e) => toast.error(e?.message || "Delete failed"),
	});

	useEffect(() => {
		if (!editingCert) {
			setCertDraft({
				name: "",
				issuer: "",
				credentialId: "",
				credentialUrl: "",
				issueDate: "",
				expiryDate: "",
			});
			return;
		}

		setCertDraft({
			name: editingCert.name ?? "",
			issuer: editingCert.issuer ?? "",
			credentialId: editingCert.credentialId ?? "",
			credentialUrl: editingCert.credentialUrl ?? "",
			issueDate: editingCert.issueDate
				? editingCert.issueDate.split("T")[0]
				: "",
			expiryDate: editingCert.expiryDate
				? editingCert.expiryDate.split("T")[0]
				: "",
		});
	}, [editingCert]);

	// which modal is open
	const [editMode, setEditMode] = useState(null);
	// "profile" | "skills" | "languages" | null

	// drafts
	const [profileDraft, setProfileDraft] = useState({
		headline: "",
		bio: "",
		location: "",
	});

	useEffect(() => {
		if (!profile) return;
		//prevent rerender while in edit mode
		if (editMode === "profile") return;

		setProfileDraft({
			headline: profile.headline || "",
			bio: profile.bio || "",
			location: profile.location || "",
		});
	}, [profile, editMode]);

	const updateProfileM = useMutation({
		mutationFn: updateTalentProfile,
		onMutate: async (payload) => {
			await qc.cancelQueries({ queryKey: queryKeys.talentProfile });
			const prev = qc.getQueryData(queryKeys.talentProfile);
			// optimistic update
			qc.setQueryData(queryKeys.talentProfile, (old) => {
				const raw = old?.data ?? old;
				const data = raw?.data ?? raw;

				const nextProfile = {
					...(data?.talentProfile ?? {}),
					...payload,
				};
				if (old?.data?.data?.talentProfile) {
					return {
						...old,
						data: {
							...old.data,
							talentProfile: nextProfile,
						},
					};
				}
				return {
					...old,
					data: { ...(raw?.data ?? {}), talentProfile: nextProfile },
				};
			});
			setEditMode(null);
			return { prev };
		},

		onSuccess: async (res) => {
			if (res?.ok === false) throw new Error(res?.message || "Update failed");
			//await qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
			toast.success("Profile Successfully Updated");
			//setEditMode(null);
		},

		onError: (err, _payload, ctx) => {
			// rollback لو فشل
			if (ctx?.prev) qc.setQueryData(queryKeys.talentProfile, ctx.prev);
			setEditMode("profile"); // رجّعي الفورم (اختياري)
			toast.error(err?.message || "Profile Update Failed");
		},
	});

	// skills
	const [skillDraft, setSkillDraft] = useState("");
	const [removingSkill, setRemovingSkill] = useState(null); // name

	// const upsertSkillM = useMutation({
	// 	mutationFn: (name) => upSertTalentSkill({ name, level: "INTERMEDIATE" }),
	// 	onSuccess: async (res) => {
	// 		if (res?.ok === false) throw new Error(res?.message || "Skill failed");
	// 		await qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
	// 		setSkillDraft("");
	// 	},
	// 	onError: (e) => toast.error(e?.message || "Skill failed"),
	// });

	const upsertSkillM = useMutation({
		mutationFn: (name) => upSertTalentSkill({ name, level: "INTERMEDIATE" }),

		onMutate: async (name) => {
			const newName = name.trim();
			if (!newName) return;

			await qc.cancelQueries({ queryKey: queryKeys.talentProfile });

			const prev = qc.getQueryData(queryKeys.talentProfile);

			// optimistic add (avoid duplicates)
			qc.setQueryData(queryKeys.talentProfile, (old) => {
				const res = old?.data ?? old;
				const data = res?.data ?? res;
				const profile = data?.talentProfile ?? data?.profile ?? data;

				const skills = Array.isArray(profile?.skills) ? profile.skills : [];
				const exists = skills.some(
					(s) => (s?.name ?? String(s)).toLowerCase() === newName.toLowerCase(),
				);
				if (exists) return old;

				const nextSkills = [
					...skills,
					{ name: newName, level: "INTERMEDIATE" },
				];

				// try to preserve same shape
				if (old?.data?.data?.talentProfile) {
					return {
						...old,
						data: {
							...old.data,
							data: {
								...old.data.data,
								talentProfile: {
									...old.data.data.talentProfile,
									skills: nextSkills,
								},
							},
						},
					};
				}
				// fallback generic
				return {
					...old,
					data: {
						...(old?.data ?? {}),
						data: {
							...((old?.data ?? {})?.data ?? {}),
							...profile,
							skills: nextSkills,
						},
					},
				};
			});

			// clear input immediately so user feels instant
			setSkillDraft("");

			return { prev };
		},

		onError: (e, _name, ctx) => {
			if (ctx?.prev) qc.setQueryData(queryKeys.talentProfile, ctx.prev);
			toast.error(e?.message || "Skill failed");
		},

		onSettled: () => {
			qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
		},
	});

	// const removeSkillM = useMutation({
	// 	mutationFn: (name) => removeTalentSkill({ name }),
	// 	onSuccess: async (res) => {
	// 		if (res?.ok === false) throw new Error(res?.message || "Remove failed");
	// 		await qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
	// 	},
	// 	onError: (e) => toast.error(e?.message || "Remove failed"),
	// });

	// languages

	const removeSkillM = useMutation({
		mutationFn: (name) => removeTalentSkill({ name }),

		onMutate: async (name) => {
			const label = name.trim();
			setRemovingSkill(label);

			await qc.cancelQueries({ queryKey: queryKeys.talentProfile });
			const prev = qc.getQueryData(queryKeys.talentProfile);

			qc.setQueryData(queryKeys.talentProfile, (old) => {
				const res = old?.data ?? old;
				const data = res?.data ?? res;
				const profile = data?.talentProfile ?? data?.profile ?? data;

				const skills = Array.isArray(profile?.skills) ? profile.skills : [];
				const nextSkills = skills.filter(
					(s) => (s?.name ?? String(s)) !== label,
				);

				if (old?.data?.data?.talentProfile) {
					return {
						...old,
						data: {
							...old.data,
							data: {
								...old.data.data,
								talentProfile: {
									...old.data.data.talentProfile,
									skills: nextSkills,
								},
							},
						},
					};
				}
				return {
					...old,
					data: {
						...(old?.data ?? {}),
						data: {
							...((old?.data ?? {})?.data ?? {}),
							...profile,
							skills: nextSkills,
						},
					},
				};
			});

			return { prev, label };
		},

		onError: (e, _name, ctx) => {
			if (ctx?.prev) qc.setQueryData(queryKeys.talentProfile, ctx.prev);
			toast.error(e?.message || "Remove failed");
		},

		onSettled: () => {
			setRemovingSkill(null);
			qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
		},
	});

	const [langDraft, setLangDraft] = useState("");
	const upsertLangM = useMutation({
		mutationFn: (name) =>
			upSertTalentLanguage({ name, proficiency: "INTERMEDIATE" }),
		onSuccess: async (res) => {
			if (res?.ok === false) throw new Error(res?.message || "Language failed");
			await qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
			setLangDraft("");
		},
		onError: (e) => toast.error(e?.message || "Language failed"),
	});
	const removeLangM = useMutation({
		mutationFn: (name) => removeTalentLanguage({ name }),
		onSuccess: async (res) => {
			if (res?.ok === false) throw new Error(res?.message || "Remove failed");
			await qc.invalidateQueries({ queryKey: queryKeys.talentProfile });
		},
		onError: (e) => toast.error(e?.message || "Remove failed"),
	});

	/***************************************** */
	const resumeQ = useTalentResumeQuery();

	const uploadResume = useUploadTalentResumeMutation();
	const deleteResume = useDeleteTalentResumeMutation();

	const avatarUrl = profile?.avatarPublicId
		? buildAvatarUrl(profile.avatarPublicId)
		: null;

	const resumeUrl = profile?.resumePublicId
		? buildCloudinaryUrl(profile.resumePublicId) // أو helper resume
		: null;

	const resumeName = profile?.resumePublicId
		? profile.resumePublicId.split("/").pop()
		: null;

	const completion = useMemo(() => {
		return calcProfileCompletion({
			...profile,
			avatarUrl: !!avatarUrl,
			resumeUrl: !!resumeUrl,
		});
	}, [profile, avatarUrl, resumeUrl]);

	const handleUploadResume = async (file) => {
		const t = toast.loading("Uploading resume...");
		try {
			const res = await uploadResume.mutateAsync(file);
			if (!res?.ok && res?.error) throw new Error(res.error);
			toast.success("Resume uploaded");
		} catch (e) {
			toast.error(e.message || "Upload failed");
		} finally {
			toast.dismiss(t);
		}
	};

	const handleDeleteResume = async () => {
		const t = toast.loading("Deleting resume...");
		try {
			const res = await deleteResume.mutateAsync();
			if (!res?.ok && res?.error) throw new Error(res.error);
			toast.success("Resume deleted");
		} catch (e) {
			toast.error(e.message || "Delete failed");
		} finally {
			toast.dismiss(t);
		}
	};

	const closeCertModal = () => {
		setCertModalOpen(false);
		setEditingCert(null);
	};

	const submitCert = () => {
		if (!certDraft.name.trim() || !certDraft.issuer.trim()) {
			toast.error("Name and provider are required");
			return;
		}

		const payload = {
			name: certDraft.name.trim(),
			issuer: certDraft.issuer.trim(),
		};

		if (certDraft.credentialId)
			payload.credentialId = certDraft.credentialId.trim();

		if (certDraft.credentialUrl)
			payload.credentialUrl = certDraft.credentialUrl.trim();

		if (certDraft.issueDate) payload.issueDate = certDraft.issueDate; // ISO string from input[type=date]

		if (certDraft.expiryDate) payload.expiryDate = certDraft.expiryDate;

		if (editingCert?.certificateId)
			payload.certificateId = editingCert.certificateId;

		upsertCertM.mutate(payload);
	};

	// handle render loading
	const isProfileLoading = isLoading;
	const hasData = Boolean(data?.data);
	if ((isLoading || isFetching) && !hasData) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<Loading />
			</div>
		);
	}
	if (!isAuthReady) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<Loading />
			</div>
		);
	}
	if (isError)
		return (
			<div className="p-6 text-red-600">
				{String(error.message || "Failed to load profile")}
			</div>
		);

	return (
		<div className="max-w-5xl mx-auto px-6 py-8 space-y-6 ">
			<CardOverlay loading={isProfileLoading} label="Updating...">
				<ProfileHeaderCard
					name={`${profile.firstName} ${profile.lastName}`}
					avatarPublicId={profile.avatarPublicId}
					completion={completion}
				/>

				{/* About / Headline card */}
				<section className="bg-white border border-slate-200 rounded-2xl p-8 mb-4 mt-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-bold text-slate-900">
								{profile?.headline || "UX/UI Designer | Frontend Developer"}
							</h2>
							<div className="mt-2">
								<Badge>{profile?.location || "Expert"}</Badge>
							</div>
						</div>

						<div className="p-2 rounded-xl hover:bg-slate-50 border">
							<PencilIcon
								onClick={() => setEditMode("profile")}
								ariaLabel="profile"
							/>
						</div>
					</div>

					<p className="mt-4 text-slate-700 leading-relaxed">
						{profile?.bio ||
							"Write a short bio that describes you. Humans love that sort of thing."}
					</p>

					{/* skills preview bullets */}
					<div className="mt-4">
						<div className="font-semibold text-slate-900 mb-2">Skills:</div>
						<ul className="list-disc pl-6 text-slate-700 space-y-1">
							{(profile?.skills || []).slice(0, 3).map((s) => (
								<li key={s.name || s}>{s.name || String(s)}</li>
							))}
						</ul>
					</div>
				</section>
				{updateProfileM.isPending && <Saving />}

				{/* Skills chips */}
				<section className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-bold">Skills</h3>
						<div className="p-2 rounded-xl hover:bg-slate-50 border">
							<PencilIcon onClick={() => setEditMode("skills")} />
						</div>
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						{(profile?.skills || []).map((s) => (
							<Chip key={s.name || s}>{s.name || String(s)}</Chip>
						))}
					</div>
				</section>

				{/* Languages chips */}
				<section className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-bold">Languages</h3>
						<div className="p-2 rounded-xl hover:bg-slate-50 border">
							<PencilIcon onClick={() => setEditMode("languages")} />
						</div>
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						{(profile?.languages || []).map((l) => (
							<Chip key={l.name || l}>{l.name || String(l)}</Chip>
						))}
					</div>
				</section>

				{/* Certificates section */}

				<section className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-bold">Certification</h3>

						<button
							type="button"
							onClick={() => {
								setEditingCert(null);
								setCertModalOpen(true);
							}}
							className="w-9 h-9 rounded-full border hover:bg-slate-50"
						>
							+
						</button>
					</div>

					<div className="mt-4 space-y-4">
						{(profile?.certificates || []).length === 0 ? (
							<div className="text-sm text-slate-500">
								No certificates yet. Add one.
							</div>
						) : (
							(profile.certificates || []).map((c) => (
								<div key={c.certificateId} className="border rounded-xl p-4">
									<div className="font-bold">{c.name}</div>
									<div className="text-sm text-slate-600">
										Provider : {c.issuer ?? ""}
									</div>
									<div className="text-sm text-slate-600">
										Issued : {c.issueDate ?? ""}
									</div>
									<div className="text-sm text-slate-600">
										CertificateId : {c.credentialId ?? "-"}
									</div>

									<div className="flex gap-2 mt-3">
										<button
											type="button"
											onClick={() => {
												setEditingCert(c);
												setCertModalOpen(true);
											}}
										>
											Edit
										</button>

										<button
											type="button"
											className="text-red-600"
											onClick={() => {
												if (confirm("Delete certificate?")) {
													deleteCertM.mutate(c.certificateId);
												}
											}}
										>
											Delete
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</section>

				<Modal
					open={certModalOpen}
					title={editingCert ? "Edit certificate" : "Add certificate"}
					onClose={closeCertModal}
					footer={
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								className="px-4 py-2 rounded-xl border hover:bg-slate-50 font-semibold"
								onClick={closeCertModal}
								disabled={upsertCertM.isPending || upsertCertM.isLoading}
							>
								Cancel
							</button>

							<button
								type="button"
								className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60"
								onClick={submitCert}
								disabled={upsertCertM.isPending || upsertCertM.isLoading}
							>
								{editingCert ? "Save" : "Add"}
							</button>
						</div>
					}
				>
					<div className="space-y-4">
						<div>
							<label
								htmlFor=""
								className="text-sm font-semibold text-slate-700"
							>
								Name *
							</label>
							<input
								name=""
								className="mt-1 w-full rounded-xl border p-3"
								value={certDraft.name}
								onChange={(e) =>
									setCertDraft((p) => ({ ...p, name: e.target.value }))
								}
								placeholder="e.g. AWS Certified Developer"
							/>
						</div>

						<div>
							<label
								htmlFor=""
								className="text-sm font-semibold text-slate-700"
							>
								Provider
							</label>
							<input
								name=""
								className="mt-1 w-full rounded-xl border p-3"
								value={certDraft.issuer}
								onChange={(e) =>
									setCertDraft((p) => ({ ...p, issuer: e.target.value }))
								}
								placeholder="e.g. Amazon"
							/>
						</div>

						<div>
							<label
								htmlFor=""
								className="text-sm font-semibold text-slate-700"
							>
								Issued
							</label>
							<input
								name=""
								className="mt-1 w-full rounded-xl border p-3"
								value={certDraft.issueDate}
								onChange={(e) =>
									setCertDraft((p) => ({ ...p, issueDate: e.target.value }))
								}
								placeholder="e.g. 2026-01"
							/>
						</div>

						<div>
							<label
								htmlFor=""
								className="text-sm font-semibold text-slate-700"
							>
								CertificateId
							</label>
							<input
								name=""
								className="mt-1 w-full rounded-xl border p-3"
								value={certDraft.credentialId}
								onChange={(e) =>
									setCertDraft((p) => ({ ...p, credentialId: e.target.value }))
								}
								placeholder="e.g. ABC-123"
							/>
						</div>
					</div>
				</Modal>

				{/* Resume */}
				<ResumeCard
					resumeUrl={resumeUrl}
					resumeName={resumeName || profile?.resumeName}
					resumeSize={resumeQ.data?.data?.size || profile?.resumeSize}
					isUploading={uploadResume.isPending || deleteResume.isPending}
					onUpload={handleUploadResume}
					onDelete={handleDeleteResume}
				/>
				{/* profile modal */}
				<Modal
					open={editMode === "profile"}
					title="Edit profile"
					onClose={() => setEditMode(null)}
					footer={
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								className="px-4 py-2 rounded-xl border hover:bg-slate-50 font-semibold"
								onClick={() => setEditMode(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60"
								disabled={updateProfileM.isPending || updateProfileM.isLoading}
								onClick={() =>
									updateProfileM.mutate({
										headline: profileDraft.headline.trim() || null,
										bio: profileDraft.bio.trim() || null,
										location: profileDraft.location.trim() || null,
									})
								}
							>
								Save
							</button>
						</div>
					}
				>
					<div className="space-y-4">
						<div>
							<label
								htmlFor="headline"
								className="text-sm font-semibold text-slate-700"
							>
								Headline
							</label>
							<input
								name="headline"
								className="mt-1 w-full rounded-xl border p-3"
								value={profileDraft.headline}
								onChange={(e) =>
									setProfileDraft((p) => ({ ...p, headline: e.target.value }))
								}
							/>
						</div>

						<div>
							<label
								htmlFor="location"
								className="text-sm font-semibold text-slate-700"
							>
								Location
							</label>
							<input
								name="location"
								className="mt-1 w-full rounded-xl border p-3"
								value={profileDraft.location}
								onChange={(e) =>
									setProfileDraft((p) => ({ ...p, location: e.target.value }))
								}
							/>
						</div>

						<div>
							<label
								htmlFor="bio"
								className="text-sm font-semibold text-slate-700"
							>
								Bio
							</label>
							<textarea
								name="bio"
								className="mt-1 w-full rounded-xl border p-3 min-h-[120px]"
								value={profileDraft.bio}
								onChange={(e) =>
									setProfileDraft((p) => ({ ...p, bio: e.target.value }))
								}
							/>
						</div>
					</div>
				</Modal>

				{/* skills modal */}
				<Modal
					open={editMode === "skills"}
					title="Edit skills"
					onClose={() => setEditMode(null)}
				>
					<div className="flex gap-2">
						<input
							className="flex-1 rounded-xl border p-3"
							placeholder="Add skill (e.g. TypeScript)"
							value={skillDraft}
							onChange={(e) => setSkillDraft(e.target.value)}
						/>
						<button
							type="button"
							className="px-4 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60"
							disabled={!skillDraft.trim() || upsertSkillM.isPending}
							onClick={() => upsertSkillM.mutate(skillDraft.trim())}
						>
							{upsertSkillM.isPending ? "Saving..." : "Add"}
						</button>
					</div>

					<div className="mt-4 flex flex-wrap gap-2">
						{(profile?.skills || []).map((s) => {
							const label = s?.name || String(s);
							const isRemovingThis =
								removingSkill === label && removeSkillM.isPending;

							return (
								<div
									key={label}
									className="flex items-center gap-2 border rounded-full px-3 py-2"
								>
									<span className="text-sm font-semibold">
										{label}{" "}
										{isRemovingThis ? (
											<span className="text-xs font-normal">(Removing...)</span>
										) : null}
									</span>
									<button
										type="button"
										className="text-red-600 text-sm font-bold"
										disabled={isRemovingThis}
										onClick={() => removeSkillM.mutate(label)}
									>
										×
									</button>
								</div>
							);
						})}
					</div>
				</Modal>

				{/* language modal */}
				<Modal
					open={editMode === "languages"}
					title="Edit languages"
					onClose={() => setEditMode(null)}
				>
					<div className="flex gap-2">
						<input
							className="flex-1 rounded-xl border p-3"
							placeholder="Add language (e.g. French)"
							value={langDraft}
							onChange={(e) => setLangDraft(e.target.value)}
						/>
						<button
							type="button"
							className="px-4 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60"
							disabled={
								!langDraft.trim() ||
								upsertLangM.isPending ||
								upsertLangM.isLoading
							}
							onClick={() => upsertLangM.mutate(langDraft.trim())}
						>
							Add
						</button>
					</div>

					<div className="mt-4 flex flex-wrap gap-2">
						{(profile?.languages || []).map((l) => {
							const label = l?.name || String(l);
							return (
								<div
									key={label}
									className="flex items-center gap-2 border rounded-full px-3 py-2"
								>
									<span className="text-sm font-semibold">{label}</span>
									<button
										type="button"
										className="text-red-600 text-sm font-bold"
										onClick={() => removeLangM.mutate(label)}
									>
										×
									</button>
								</div>
							);
						})}
					</div>
				</Modal>
			</CardOverlay>
		</div>
	);
}
