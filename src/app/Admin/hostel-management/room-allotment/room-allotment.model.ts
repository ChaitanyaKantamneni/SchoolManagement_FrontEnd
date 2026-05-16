export interface RoomAllotment {
  ID?: string | null;
  SchoolID?: string | null;
  AcademicYear?: string | null;
  HostelID?: string | null;
  RoomID?: string | null;
  StudentID?: string | null;
  AllotmentDate?: string | null;
  Remarks?: string | null;
  IsActive?: string | number | null;
  CreatedBy?: string | null;
  ModifiedBy?: string | null;

  // Display fields returned by JOINs
  HostelName?: string | null;
  RoomNumber?: string | null;
  BedCapacity?: string | number | null;
  OccupiedBeds?: string | number | null;
  AvailableBeds?: string | number | null;
  SchoolName?: string | null;
  AcademicYearName?: string | null;
  StudentName?: string | null;

  // Control fields
  Flag?: string | null;
  Status?: string | null;
  Limit?: number | null;
  Offset?: number | null;
}

export interface RoomAllotmentResponse {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: RoomAllotment[];
}
