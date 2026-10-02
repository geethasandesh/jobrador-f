"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createLead } from "@/lib/api/client";
import { CATEGORY_OPTIONS, LEAD_JOB_TYPE_OPTIONS } from "@/lib/labels";
import { BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";

export function ReportForm({
  embedded = false,
  areaLabel,
  latitude,
  longitude,
  onCreated,
}: {
  embedded?: boolean;
  areaLabel?: string;
  latitude?: number;
  longitude?: number;
  onCreated?: (lead: { id: string; latitude: number; longitude: number; area: string }) => void;
}) {
  const router = useRouter();
  const matchedPlace = BERLIN_PLACES.find((item) => item.label === areaLabel);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("MINIJOB");
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
      setError(caught instanceof ApiError ? caught.message : "Could not submit the lead.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={embedded ? "space-y-4" : "mx-auto max-w-xl space-y-4 px-4 py-8"}>
      <div>
        {embedded ? null : <h1 className="font-serif text-4xl text-ink">Report a hiring lead</h1>}
        <p className={embedded ? "text-sm text-muted" : "mt-2 text-muted"}>
          Found a place hiring? Share what you actually saw. This is a student report, not a confirmed job.
        </p>
      </div>

      <label className="block text-sm font-medium">
        Company / business name
        <input className="field mt-1" required minLength={2} maxLength={80} value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Area
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
        <div className="flex items-end">
          <button type="button" onClick={useMyLocation} className="rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium">
            Use current location
          </button>
        </div>
      </div>
      {point ? <p className="text-sm text-brand">Using your current location.</p> : null}

      <label className="block text-sm font-medium">
        Address, if you have it
        <input className="field mt-1" maxLength={160} value={address} onChange={(event) => setAddress(event.target.value)} />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Job type</legend>
        <div className={embedded ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
          {LEAD_JOB_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="jobType" value={option.value} checked={jobType === option.value} onChange={() => setJobType(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium">
        Category
        <select className="field mt-1" value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium">
        What did you find?
        <textarea className="field mt-1 min-h-28" required minLength={10} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className={embedded ? "grid gap-3" : "grid gap-3 sm:grid-cols-3"}>
        <label className="block text-sm font-medium">
          Salary €/hour
          <input className="field mt-1" inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="Optional" />
        </label>
        <label className="block text-sm font-medium">
          Hours from
          <input className="field mt-1" inputMode="numeric" value={hoursMin} onChange={(event) => setHoursMin(event.target.value)} placeholder="Optional" />
        </label>
        <label className="block text-sm font-medium">
          Hours to
          <input className="field mt-1" inputMode="numeric" value={hoursMax} onChange={(event) => setHoursMax(event.target.value)} placeholder="Optional" />
        </label>
      </div>

      <p className="text-sm text-muted">
        Leave salary and hours empty if you do not know them. Photo upload starts when accounts do.
      </p>

      {error ? <p className="text-sm text-place">{error}</p> : null}

      <button type="submit" disabled={pending} className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Submitting…" : "Submit hiring lead"}
      </button>
    </form>
  );
}
