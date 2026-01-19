import { Timestamp } from "firebase/firestore";

// Enums
export type UserRole = "PHARMACY" | "SUBSTITUTE";
export type Qualification = "GYÓGYSZERÉSZ" | "SZAKASSZISZTENS" | "ASSZISZTENS";
export type AdStatus = "OPEN" | "CLOSED";
export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";
//export type ShiftType = "egész nap" | "délelőtt" | "délután";

// Address type
export interface Address {
  zip: string;
  city: string;
  street: string;
  region: string;
}

// Salary type
export interface Salary {
  amount?: number;
  type: "órabér" | "napidíj";
  basis: "nettó" | "bruttó";
  invoiceRequired: boolean;
}

// User document - users/{userId}
export interface User {
  id?: string;
  role: UserRole;
  email: string;
  name?: string;
  createdAt: Timestamp;
}

// Pharmacy profile - pharmacies/{pharmacyId}
export interface Pharmacy {
  id?: string;
  userId: string;
  name: string;
  address: Address;
  phone: string;
  email?: string;
  createdAt: Timestamp;
}

// Substitute profile - substitutes/{substituteId}
export interface Substitute {
  id?: string;
  userId: string;
  name: string;
  qualification: Qualification;
  experienceYears: number;
  availableRegions: string[];
  bio: string;
  isOpenToWork: boolean;
  availabilityNote?: string;
  phone?: string;
  email?: string;
}

// Job ad - ads/{adId}
export interface Ad {
  id?: string;
  userId: string;
  pharmacyId: string;
  position: Qualification;
  dateFrom: Timestamp;
  dateTo?: Timestamp;
  address: Address;
  startTime: string;
  endTime: string;
  salary: Salary;
  description: string;
  experienceRequired?: number;
  notes?: string;
  status: AdStatus;
  createdAt: Timestamp;
  email?: string;
  phone?: string;
  name?: string;
}

// Application - applications/{applicationId}
export interface Application {
  id?: string;
  adId: string;
  substituteId: string;
  status: ApplicationStatus;
  appliedAt: Timestamp;
}

// Extended types with relations (for UI display)
export interface AdWithPharmacy extends Ad {
  pharmacy?: Pharmacy;
}

export interface ApplicationWithDetails extends Application {
  ad?: Ad;
  substitute?: Substitute;
  pharmacy?: Pharmacy;
}
