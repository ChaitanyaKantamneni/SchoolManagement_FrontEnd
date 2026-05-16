export interface OutPass {
  ID?: string | null;
  SchoolID?: string | null;
  AcademicYear?: string | null;
  HostelID?: string | null;
  RoomID?: string | null;
  StudentID?: string | null;
  OutDateTime?: string | null;
  ExpectedReturnDateTime?: string | null;
  ActualReturnDateTime?: string | null;
  Destination?: string | null;
  Reason?: string | null;
  OutPassStatus?: string | null;
  ApprovedBy?: string | null;
  ApprovedDate?: string | null;
  Remarks?: string | null;
  IsActive?: string | number | null;
  CreatedBy?: string | null;
  CreatedIp?: string | null;
  CreatedDate?: Date | string | null;
  ModifiedBy?: string | null;
  ModifiedIp?: string | null;
  ModifiedDate?: Date | string | null;

  // Display fields
  HostelName?: string | null;
  RoomNumber?: string | null;
  SchoolName?: string | null;
  AcademicYearName?: string | null;
  StudentName?: string | null;

  // Control fields
  Flag?: string | null;
  Status?: string | null;
  Limit?: number | null;
  Offset?: number | null;
  totalcount?: number | null;
}

export interface OutPassResponse {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: OutPass[];
}
