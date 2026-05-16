export interface HostelMaster {
  ID?: string | null;
  SchoolID?: string | null;
  AcademicYear?: string | null;
  HostelName?: string | null;
  HostelType?: string | null; // Boys, Girls, Mixed
  TotalRooms?: string | number | null;
  BedCapacity?: string | number | null;
  Address?: string | null;
  Remarks?: string | null;
  IsActive?: string | boolean | number | null;
  CreatedBy?: string | null;
  CreatedIp?: string | null;
  CreatedDate?: string | Date | null;
  ModifiedBy?: string | null;
  ModifiedIp?: string | null;
  ModifiedDate?: string | Date | null;

  // Display fields
  SchoolName?: string | null;
  AcademicYearName?: string | null;

  // Common control fields
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

export interface HostelMasterResponse {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: HostelMaster[];
}
