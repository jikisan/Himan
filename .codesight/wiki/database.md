# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**unknown** — 21 models

### folders

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `name`: text _(required)_
- `color`: text
- `icon`: text
- `user_id`: uuid _(required, fk)_

### notes

pk: `id` (uuid) · fk: folder_id, user_id

- `id`: uuid _(pk)_
- `title`: text _(required)_
- `content`: text _(required)_
- `excerpt`: text _(required)_
- `folder_id`: uuid _(fk)_
- `user_id`: uuid _(required, fk)_
- `is_pinned`: boolean _(required)_

### password_categories

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `name`: text _(required)_
- `icon`: text
- `user_id`: uuid _(required, fk)_

### passwords

pk: `id` (uuid) · fk: category_id, user_id

- `id`: uuid _(pk)_
- `title`: text _(required)_
- `username`: text
- `encrypted_password`: text _(required)_
- `url`: text
- `notes`: text
- `category_id`: uuid _(fk)_
- `user_id`: uuid _(required, fk)_
- `is_favorite`: boolean _(default)_

### user_subscriptions

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `tier`: subscription_tier _(required)_
- `valid_until`: timestamp with time zone

### usage_limits

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `notes_count`: integer _(required)_
- `folders_count`: integer _(required)_
- `passwords_count`: integer _(required)_
- `categories_count`: integer _(required)_

### storage_folders

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `name`: text _(required)_
- `files_count`: integer _(required)_

### files

pk: `id` (uuid) · fk: user_id, folder_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `folder_id`: uuid _(fk)_
- `name`: text _(required)_
- `size`: bigint _(required)_
- `mime_type`: text _(required)_
- `description`: text
- `thumbnail_url`: text
- `storage_path`: text _(required)_

### card_categories

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `name`: text _(required)_
- `icon`: text
- `user_id`: uuid _(required, fk)_

### credit_cards

pk: `id` (uuid) · fk: category_id, user_id

- `id`: uuid _(pk)_
- `card_name`: text _(required)_
- `encrypted_card_number`: text _(required)_
- `encrypted_cvv`: text _(required)_
- `expiry_month`: integer _(required)_
- `expiry_year`: integer _(required)_
- `bank_name`: text
- `card_issuer`: text
- `card_type`: text
- `category_id`: uuid _(fk)_
- `user_id`: uuid _(required, fk)_
- `is_favorite`: boolean _(default)_
- `notes`: text

### invoice_folders

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `name`: text _(required)_
- `invoice_number_prefix`: text
- `invoice_number_format`: text _(required)_
- `next_sequence_number`: integer _(required)_
- `invoices_count`: integer _(required)_

### invoices

pk: `id` (uuid) · fk: user_id, folder_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `folder_id`: uuid _(fk)_
- `invoice_number`: text _(required)_
- `po_number`: text
- `company_details`: text
- `bill_to`: text
- `invoice_date`: date
- `due_date`: date
- `currency`: text _(required)_
- `line_items`: jsonb _(required)_
- `tax_rate`: numeric
- `discount`: numeric
- `shipping_fee`: numeric
- `subtotal`: numeric
- `tax_amount`: numeric
- `total`: numeric
- `notes`: text
- `bank_details`: text
- `storage_path`: text
- `file_size`: bigint
- `is_favorite`: boolean _(required)_

### invoice_saved_options

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `option_type`: text _(required)_
- `label`: text _(required)_
- `value`: text _(required)_
- `is_default`: boolean _(required)_
- `sort_order`: integer _(required)_

### product_catalog

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `name`: text _(required)_
- `category`: text
- `default_quantity`: numeric _(default)_
- `default_unit`: text
- `lifespan_days`: integer
- `last_purchased_at`: timestamp with time zone
- `purchase_count`: integer _(default)_

### grocery_lists

pk: `id` (uuid) · fk: owner_id

- `id`: uuid _(pk)_
- `name`: text _(required)_
- `owner_id`: uuid _(required, fk)_
- `is_archived`: boolean _(default)_

### grocery_list_members

pk: `id` (uuid) · fk: list_id, user_id, invited_by

- `id`: uuid _(pk)_
- `list_id`: uuid _(required, fk)_
- `user_id`: uuid _(required, fk)_
- `role`: text _(required)_
- `invited_by`: uuid _(fk)_
- `joined_at`: timestamp with time zone _(default)_

### grocery_items

pk: `id` (uuid) · fk: list_id, product_id

- `id`: uuid _(pk)_
- `list_id`: uuid _(required, fk)_
- `product_id`: uuid _(fk)_
- `name`: text _(required)_
- `category`: text
- `quantity`: numeric _(default)_
- `unit`: text
- `notes`: text
- `is_checked`: boolean _(default)_
- `price`: numeric
- `added_by`: uuid _(required)_
- `sort_order`: integer _(default)_

### grocery_sessions

pk: `id` (uuid)

- `id`: uuid _(pk)_
- `started_by`: uuid _(required)_
- `store_name`: text
- `status`: text _(required)_
- `started_at`: timestamp with time zone _(default)_
- `completed_at`: timestamp with time zone

### grocery_session_items

pk: `id` (uuid) · fk: session_id, grocery_item_id

- `id`: uuid _(pk)_
- `session_id`: uuid _(required, fk)_
- `grocery_item_id`: uuid _(fk)_
- `list_name`: text _(required)_
- `name`: text _(required)_
- `category`: text
- `quantity`: numeric _(default)_
- `unit`: text
- `notes`: text
- `is_purchased`: boolean _(default)_
- `purchased_at`: timestamp with time zone
- `price`: numeric

### grocery_session_members

pk: `id` (uuid) · fk: session_id, user_id

- `id`: uuid _(pk)_
- `session_id`: uuid _(required, fk)_
- `user_id`: uuid _(required, fk)_
- `added_by`: uuid _(required)_
- `joined_at`: timestamp with time zone _(default)_

### grocery_invitations

pk: `id` (uuid) · fk: list_id

- `id`: uuid _(pk)_
- `list_id`: uuid _(required, fk)_
- `invited_by`: uuid _(required)_
- `invited_email`: text _(required)_
- `status`: text _(default)_

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_