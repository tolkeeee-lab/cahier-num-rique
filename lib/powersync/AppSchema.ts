import { column, Schema, Table } from '@powersync/web';

const sales = new Table({
  shop_id: column.text,
  date: column.text,
  time: column.text,
  type: column.text,
  status: column.text,
  category: column.text,
  notes: column.text,
  pen_color: column.text,
  total_amount: column.real,
  paid_amount: column.real,
  debt_amount: column.real,
  client_name: column.text,
  created_at: column.text,
});

const sold_articles = new Table({
  sale_id: column.text,
  product_name: column.text,
  quantity: column.real,
  unit_price: column.real,
});

const products = new Table({
  shop_id: column.text,
  name: column.text,
  selling_price: column.real,
  cost_price: column.real,
  carton_price: column.real,
  half_package_price: column.real,
  quarter_package_price: column.real,
  eighth_package_price: column.real,
  initial_stock: column.real,
  category: column.text,
  is_wholesale: column.integer,
  wholesale_qty: column.real,
  wholesale_price: column.real,
  items_per_wholesale: column.real,
  barcode: column.text,
  created_at: column.text,
});

const cash_closings = new Table({
  shop_id: column.text,
  date: column.text,
  expected_cash: column.real,
  actual_cash: column.real,
  difference: column.real,
  cash_out: column.real,
  expenses: column.real,
  remaining_cash: column.real,
  notes: column.text,
  created_at: column.text,
});

const shopping_list = new Table({
  shop_id: column.text,
  name: column.text,
  quantity: column.real,
  unit_cost: column.real,
  is_wholesale: column.integer,
  wholesale_qty: column.real,
  wholesale_price: column.real,
  items_per_wholesale: column.real,
  is_checked: column.integer,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  sales,
  sold_articles,
  products,
  cash_closings,
  shopping_list,
});
