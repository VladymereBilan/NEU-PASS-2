export type AccountType = "visitor" | "guard";

export type AccountStatus = "Active" | "Blocked";

export type UserAccount = {
  id: string;
  accountType: AccountType;
  fullName: string;
  email: string;
  contactNumber: string;
  username: string;
  passwordDigest: string;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
};
