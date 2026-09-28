import type { SourceCourse } from "../scripts/course-data/types"
import { buildSectionData, parseSourceClasses } from "../scripts/section-data/core"
import type { SourceClass } from "../scripts/section-data/types"

function sourceClass(overrides: Partial<SourceClass> = {}): SourceClass {
  return {
    term_code: "2610",
    course_id: "000001",
    section: "L1",
    number: 101,
    role: "E",
    type: "LEC",
    association: 1,
    remarks: "Bring notes",
    capacity: 50,
    enroll: 40,
    wait: 2,
    consent: false,
    open: true,
    schedules: [
      {
        weekday: "Mon",
        date_from: new Date("2026-09-01T00:00:00.000Z"),
        date_to: new Date("2026-11-30T00:00:00.000Z"),
        time_from: 50_400_000_000n,
        time_to: 55_200_000_000n,
        venue: "LTA",
        venue_name: "Lecture Theater A",
        instructors: ["Prof A"],
      },
    ],
    reservations: [{ name: "COMP", quota: 10, enroll: 8 }],
    status: "ACTIVE",
    timestamp: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  }
}

const courses = [
  { id: "000001", term_code: "2610" },
  { id: "000001", term_code: "2530" },
] as SourceCourse[]

describe("section data preprocessing", () => {
  test("keeps the latest class snapshot, joins by term and id, and compacts meetings", () => {
    const result = buildSectionData(courses, [
      sourceClass({ enroll: 20 }),
      sourceClass({ enroll: 45, timestamp: new Date("2026-09-02T00:00:00.000Z") }),
      sourceClass({ course_id: "999999", section: "T1" }),
      sourceClass({ section: "LA1", type: "LAB" }),
      sourceClass({ section: "T1", type: "TUT" }),
      sourceClass({ section: "L2", status: "INACTIVE" }),
    ])

    const sections = result.files.get("2610")?.sectionsByCourseId["000001"]
    expect(sections?.map((section) => section.section)).toEqual(["L1", "T1", "LA1"])
    expect(sections?.[0]).toMatchObject({
      enrolled: 45,
      waitlisted: 2,
      snapshotAt: "2026-09-02T00:00:00.000Z",
      meetings: [
        {
          dateFrom: "2026-09-01",
          timeFrom: "14:00",
          timeTo: "15:20",
          venueName: "Lecture Theater A",
        },
      ],
      reservations: [{ name: "COMP", quota: 10, enrolled: 8 }],
    })
    expect(result.files.get("2530")?.sectionsByCourseId).toEqual({})
    expect(result.stats.find((term) => term.termCode === "2610")).toMatchObject({
      sourceRows: 6,
      latestRows: 5,
      activeRows: 4,
      matchedRows: 3,
      unmatchedRows: 1,
      coursesWithSections: 1,
    })
  })

  test("latest inactive snapshot removes a formerly active section", () => {
    const result = buildSectionData(courses, [
      sourceClass(),
      sourceClass({ status: "INACTIVE", timestamp: new Date("2026-09-03T00:00:00.000Z") }),
    ])
    expect(result.files.get("2610")?.sectionsByCourseId).toEqual({})
  })

  test("rejects ambiguous duplicate snapshots and malformed source records", () => {
    expect(() => buildSectionData(courses, [sourceClass(), sourceClass()])).toThrow(
      "Duplicate schedule snapshot",
    )
    expect(() =>
      parseSourceClasses(
        [{ ...sourceClass(), schedules: [{ weekday: "Mon" }] }],
        new Set(["2610"]),
      ),
    ).toThrow("venue")
  })
})
