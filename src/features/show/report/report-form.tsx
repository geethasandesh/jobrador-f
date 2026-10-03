"use client";

import { Caveat } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createLead } from "@/lib/api/client";
import { CATEGORY_OPTIONS, LEAD_JOB_TYPE_OPTIONS } from "@/lib/labels";
import { BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";

const handwriting = Caveat({ weight: "600", subsets: ["latin"] });

export function ReportForm({
  embedded = false,
  areaLabel,
  latitude,
  longitude,
  purpose = "tip",
  onCreated,
}: {
  embedded?: boolean;
  areaLabel?: string;
  latitude?: number;
  longitude?: number;
  purpose?: "tip" | "business";
  onCreated?: (lead: { id: string; latitude: number; longitude: number; area: string }) => void;
}) {
  const router = useRouter();
  const matchedPlace = BERLIN_PLACES.find((item) => item.label === areaLabel);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState(purpose === "business" ? "MINIJOB" : "NOT_SURE");
  const [category, setCategory] = useState("restaurant");
  const [placeId, setPlaceId] = useState(matchedPlace?.id ?? DEFAULT_PLACE.id);
  const [address, setAddress] = useState("");
  const [salary, setSalary] = useState("");
  const [hoursMin, setHoursMin] = useState("");
  const [hoursMax, setHoursMax] = useState("");
  const [point, setPoint] = useState<{ latitude: number; longitude: number; area: string } | null>(
    embedded && !matchedPlace && latitude != null && longitude != null
      ? { latitude, longitude, area: areaLabel || "Your location" }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const place = BERLIN_PLACES.find((item) => item.id === placeId) ?? DEFAULT_PLACE;
  const location = point ?? { latitude: place.latitude, longitude: place.longitude, area: place.label };
  const business = purpose === "business";

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot share a location. Pick an area instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          area: "Your location",
        });
        setError(null);
      },
      () => setError("Location was blocked. Pick an area instead."),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await createLead({
        businessName,
        description,
        jobType,
        category,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address || undefined,
        area: location.area,
        salaryMin: salary ? Number(salary) : undefined,
        hoursMin: hoursMin ? Number(hoursMin) : undefined,
        hoursMax: hoursMax ? Number(hoursMax) : undefined,
        poster: business ? "business" : "student",
      });
      if (onCreated) {
        onCreated({
          id: created.lead.id,
          latitude: created.lead.latitude,
          longitude: created.lead.longitude,
          area: created.lead.area,
        });
        setPending(false);
        return;
      }
      router.push(`/leads/${created.lead.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : business ? "Could not post that job." : "Could not share that tip.");
      setPending(false);
    }
  }

  const areaField = (
    <label className="block text-sm font-medium">
      {business ? "Area" : "Where in Berlin"}
      <select
        className="field mt-1"
        value={placeId}
        onChange={(event) => {
          setPlaceId(event.target.value);
          setPoint(null);
        }}
      >
        {BERLIN_PLACES.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </label>
  );

  const locationButton = (
    <button type="button" onClick={useMyLocation} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium">
      {business ? "Use the shop location" : "Use where I am"}
    </button>
  );

  const typeChips = (
    <div className="flex flex-wrap gap-2">
      {LEAD_JOB_TYPE_OPTIONS.map((option) => {
        const on = jobType === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setJobType(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const payFields = (
    <div className="grid gap-3">
      <label className="block text-sm font-medium">
        € / hour
        <input className="field mt-1" inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="Leave blank if unknown" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Hours from
          <input className="field mt-1" inputMode="numeric" value={hoursMin} onChange={(event) => setHoursMin(event.target.value)} placeholder="—" />
        </label>
        <label className="block text-sm font-medium">
          Hours to
          <input className="field mt-1" inputMode="numeric" value={hoursMax} onChange={(event) => setHoursMax(event.target.value)} placeholder="—" />
        </label>
      </div>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className={embedded ? "" : "mx-auto max-w-xl px-4 py-8"}>
      {business ? (
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="border-b border-dashed border-line px-4 py-3">
            <p className="text-[11px] font-bold tracking-[0.18em]">NOW HIRING</p>
            <p className="mt-1 text-sm text-muted">A job from your business. You can stop hiring or delete it later.</p>
          </div>
          <div className="space-y-4 p-4">
            <label className="block">
              <span className="text-sm font-medium">Business name</span>
              <input
                className="mt-1 w-full border-0 border-b border-line bg-transparent px-0 py-2 text-2xl font-semibold outline-none placeholder:text-zinc-300"
                required
                minLength={2}
                maxLength={80}
                placeholder="Café name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Role you are hiring for
              <textarea
                className="field mt-1 min-h-24"
                required
                minLength={10}
                maxLength={500}
                placeholder="Weekend barista, German not required"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Contract</legend>
              {typeChips}
            </fieldset>
            <label className="block text-sm font-medium">
              Kind of place
              <select className="field mt-1" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {areaField}
            {locationButton}
            {point ? <p className="text-sm text-brand">Using your current location.</p> : null}
            <label className="block text-sm font-medium">
              Street address
              <input className="field mt-1" maxLength={160} placeholder="Optional" value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
            <div className="rounded-2xl bg-zinc-50 p-3">
              <p className="text-sm font-medium">Pay and hours</p>
              <p className="mb-3 mt-1 text-sm text-muted">Leave these empty if you are not publishing them.</p>
              {payFields}
            </div>
            {error ? <p className="text-sm text-place">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Posting…" : "Post this job"}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative bg-[#ffe56a] px-4 pb-5 pt-6 shadow-[0_14px_30px_rgba(20,20,20,0.16)]">
          <span className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-8deg] bg-white/70" aria-hidden />
          <p className={`${handwriting.className} text-3xl leading-none text-ink`}>I saw a place hiring</p>
          <p className="mt-2 text-sm text-ink/70">A student tip. It is not a confirmed job.</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Place</span>
              <input
                className={`${handwriting.className} mt-1 w-full border-0 border-b border-ink/20 bg-transparent px-0 py-1 text-3xl text-ink outline-none placeholder:text-ink/35`}
                required
                minLength={2}
                maxLength={80}
                placeholder="The café on the corner"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              What I noticed
              <textarea
                className="mt-1 min-h-28 w-full resize-none bg-white/50 px-3 py-2 text-sm outline-none placeholder:text-ink/40"
                required
                minLength={10}
                maxLength={500}
                placeholder="A sign in the window said they need weekend help"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            {areaField}
            {locationButton}
            {point ? <p className="text-sm">Using your current location.</p> : null}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">It looked like</legend>
              {typeChips}
            </fieldset>
            <label className="block text-sm font-medium">
              Kind of place
              <select className="field mt-1" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <details className="rounded-2xl bg-white/45 p-3">
              <summary className="cursor-pointer text-sm font-medium">Address, pay, or hours — only if I actually know</summary>
              <div className="mt-3 space-y-3">
                <label className="block text-sm font-medium">
                  Address
                  <input className="field mt-1" maxLength={160} value={address} onChange={(event) => setAddress(event.target.value)} />
                </label>
                {payFields}
              </div>
            </details>
            {error ? <p className="text-sm text-place">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Sharing…" : "Share this tip"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
