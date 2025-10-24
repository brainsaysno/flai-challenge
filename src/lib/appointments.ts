import { eq, and, gte, lt } from "drizzle-orm";
import { db } from "~/server/db";
import { appointments, contacts } from "~/server/db/schema";

const BUSINESS_HOURS_START = 9;
const BUSINESS_HOURS_END = 17;
const APPOINTMENT_DURATION_HOURS = 1;

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function getBusinessHourSlots(): number[] {
  const slots: number[] = [];
  for (
    let hour = BUSINESS_HOURS_START;
    hour < BUSINESS_HOURS_END;
    hour += APPOINTMENT_DURATION_HOURS
  ) {
    slots.push(hour);
  }
  return slots;
}

function formatTimeSlot(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${period}`;
}

export async function checkAvailability(
  dateString: string
): Promise<string[]> {
  const requestedDate = new Date(dateString + "T00:00:00");

  if (!isWeekday(requestedDate)) {
    return [];
  }

  const startOfDay = new Date(requestedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(requestedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.scheduledAt, startOfDay),
        lt(appointments.scheduledAt, endOfDay)
      )
    );

  const bookedHours = new Set(
    existingAppointments.map((apt) => apt.scheduledAt.getHours())
  );

  const availableSlots = getBusinessHourSlots()
    .filter((hour) => !bookedHours.has(hour))
    .map(formatTimeSlot);

  return availableSlots;
}

export async function scheduleAppointment(
  contactId: string,
  dateTimeString: string
): Promise<{ success: boolean; message: string; appointmentId?: string }> {
  const appointmentDate = new Date(dateTimeString);

  if (!isWeekday(appointmentDate)) {
    return {
      success: false,
      message: "Appointments are only available Monday through Friday.",
    };
  }

  const hour = appointmentDate.getHours();
  if (hour < BUSINESS_HOURS_START || hour >= BUSINESS_HOURS_END) {
    return {
      success: false,
      message: `Appointments are only available between ${formatTimeSlot(BUSINESS_HOURS_START)} and ${formatTimeSlot(BUSINESS_HOURS_END - 1)}.`,
    };
  }

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    return {
      success: false,
      message: "Contact not found.",
    };
  }

  const startOfHour = new Date(appointmentDate);
  startOfHour.setMinutes(0, 0, 0);

  const endOfHour = new Date(appointmentDate);
  endOfHour.setMinutes(59, 59, 999);

  const existingAppointment = await db.query.appointments.findFirst({
    where: and(
      gte(appointments.scheduledAt, startOfHour),
      lt(appointments.scheduledAt, endOfHour)
    ),
  });

  if (existingAppointment) {
    return {
      success: false,
      message: `The ${formatTimeSlot(hour)} time slot is already booked. Please choose another time.`,
    };
  }

  const [newAppointment] = await db
    .insert(appointments)
    .values({
      contactId,
      campaignId: contact.campaignId,
      scheduledAt: startOfHour,
    })
    .returning();

  if (!newAppointment) {
    return {
      success: false,
      message: "Failed to create appointment.",
    };
  }

  const formattedDate = startOfHour.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    success: true,
    message: `Appointment successfully scheduled for ${formattedDate} at ${formatTimeSlot(hour)}.`,
    appointmentId: newAppointment.id,
  };
}
