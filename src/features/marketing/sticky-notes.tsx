import { ExampleSticky, StudentWall } from "@/features/marketing/student-wall";

const notes = [
  {
    id: "wall_ex_01",
    color: "#c6f56e",
    rotate: -7,
    tape: -12,
    parts: [
      { text: "I " },
      { text: "opened another listing page", strike: true },
      { text: " and missed the café nearby" },
    ],
  },
  {
    id: "wall_ex_02",
    color: "#ff8ad4",
    rotate: 5,
    tape: 8,
    parts: [
      { text: "I kept " },
      { text: "ten open tabs", strike: true },
      { text: " for one Minijob and never saw how far it was" },
    ],
  },
  {
    id: "wall_ex_03",
    color: "#6eb8f5",
    rotate: -2,
    tape: 4,
    parts: [
      { text: "I sorted " },
      { text: "newest first", strike: true },
      { text: " and lost the job two stops away" },
    ],
  },
  {
    id: "wall_ex_04",
    color: "#ffb56b",
    rotate: 4,
    tape: -6,
    parts: [
      { text: "Nothing was posted", strike: true },
      { text: ", so I walked over and asked" },
    ],
  },
  {
    id: "wall_ex_05",
    color: "#ffe56a",
    rotate: -6,
    tape: 6,
    parts: [
      { text: "I found it " },
      { text: "on a list", strike: true },
      { text: " and opened the posting from the map" },
    ],
  },
  {
    id: "wall_ex_06",
    color: "#e2b0f6",
    rotate: 3,
    tape: -4,
    parts: [
      { text: "I " },
      { text: "knew the job title", strike: true },
      { text: " and still had no distance from where I was" },
    ],
  },
  {
    id: "wall_ex_07",
    color: "#8ee0cf",
    rotate: -3,
    tape: 10,
    parts: [
      { text: "It was " },
      { text: "just another tab", strike: true },
      { text: " until the pin sat on my route" },
    ],
  },
];

export function StickyNotes() {
  return (
    <section className="w-full pb-28">
      <h2 className="mx-auto max-w-md px-6 text-center text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] text-ink sm:text-[1.55rem]">
        A listing page leaves out the job around the corner. Like:
      </h2>
      <StudentWall>
        {notes.map((note) => (
          <ExampleSticky key={note.id} {...note} />
        ))}
      </StudentWall>
    </section>
  );
}
