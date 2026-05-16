export interface RoomMaster {
  ID?: string | null;
  SchoolID?: string | null;
  AcademicYear?: string | null;
  HostelID?: string | null;
  RoomNumber?: string | null;
  BedCapacity?: string | number | null;
  Occupied?: string | number | boolean | null;
  Remarks?: string | null;
  IsActive?: string | number | boolean | null;

  // Display fields returned by JOINs
  HostelName?: string | null;
  SchoolName?: string | null;
  AcademicYearName?: string | null;
  OccupiedBeds?: string | number | null;
  AvailableBeds?: string | number | null;

  // Control Fields
  Flag?: string | null;
  Status?: string | null;
  Limit?: number | null;
  LastCreatedDate?: string | Date | null;
  LastID?: number | null;
  totalcount?: number | null;
  SortColumn?: string | null;
  SortDirection?: string | null;
  Offset?: number | null;
}

export interface RoomMasterResponse {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: RoomMaster[];
}
