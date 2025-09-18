
export enum Category {
  Groceries = 'Groceries',
  Transport = 'Transport',
  Entertainment = 'Entertainment',
  Utilities = 'Utilities',
  Rent = 'Rent',
  Shopping = 'Shopping',
  Income = 'Income',
  Other = 'Other',
}

export enum TransactionType {
  Debit = 'Debit',
  Credit = 'Credit',
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
}

export interface ForecastDataPoint {
  date: string;
  actual: number;
  forecast?: number;
}
