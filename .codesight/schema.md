# Schema

### folders
- id: uuid (pk)
- name: text (required)
- color: text
- icon: text
- user_id: uuid (required, fk)

### notes
- id: uuid (pk)
- title: text (required)
- content: text (required)
- excerpt: text (required)
- folder_id: uuid (fk)
- user_id: uuid (required, fk)
- is_pinned: boolean (required)

### password_categories
- id: uuid (pk)
- name: text (required)
- icon: text
- user_id: uuid (required, fk)

### passwords
- id: uuid (pk)
- title: text (required)
- username: text
- encrypted_password: text (required)
- url: text
- notes: text
- category_id: uuid (fk)
- user_id: uuid (required, fk)
- is_favorite: boolean (default)

### user_subscriptions
- id: uuid (pk)
- user_id: uuid (required, fk)
- tier: subscription_tier (required)
- valid_until: timestamp with time zone

### usage_limits
- id: uuid (pk)
- user_id: uuid (required, fk)
- notes_count: integer (required)
- folders_count: integer (required)
- passwords_count: integer (required)
- categories_count: integer (required)

### storage_folders
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)
- files_count: integer (required)

### files
- id: uuid (pk)
- user_id: uuid (required, fk)
- folder_id: uuid (fk)
- name: text (required)
- size: bigint (required)
- mime_type: text (required)
- description: text
- thumbnail_url: text
- storage_path: text (required)

### card_categories
- id: uuid (pk)
- name: text (required)
- icon: text
- user_id: uuid (required, fk)

### credit_cards
- id: uuid (pk)
- card_name: text (required)
- encrypted_card_number: text (required)
- encrypted_cvv: text (required)
- expiry_month: integer (required)
- expiry_year: integer (required)
- bank_name: text
- card_issuer: text
- card_type: text
- category_id: uuid (fk)
- user_id: uuid (required, fk)
- is_favorite: boolean (default)
- notes: text

### invoice_folders
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)
- invoice_number_prefix: text
- invoice_number_format: text (required)
- next_sequence_number: integer (required)
- invoices_count: integer (required)

### invoices
- id: uuid (pk)
- user_id: uuid (required, fk)
- folder_id: uuid (fk)
- invoice_number: text (required)
- po_number: text
- company_details: text
- bill_to: text
- invoice_date: date
- due_date: date
- currency: text (required)
- line_items: jsonb (required)
- tax_rate: numeric
- discount: numeric
- shipping_fee: numeric
- subtotal: numeric
- tax_amount: numeric
- total: numeric
- notes: text
- bank_details: text
- storage_path: text
- file_size: bigint
- is_favorite: boolean (required)

### invoice_saved_options
- id: uuid (pk)
- user_id: uuid (required, fk)
- option_type: text (required)
- label: text (required)
- value: text (required)
- is_default: boolean (required)
- sort_order: integer (required)

### product_catalog
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)
- category: text
- default_quantity: numeric (default)
- default_unit: text
- lifespan_days: integer
- last_purchased_at: timestamp with time zone
- purchase_count: integer (default)

### grocery_lists
- id: uuid (pk)
- name: text (required)
- owner_id: uuid (required, fk)
- is_archived: boolean (default)

### grocery_list_members
- id: uuid (pk)
- list_id: uuid (required, fk)
- user_id: uuid (required, fk)
- role: text (required)
- invited_by: uuid (fk)
- joined_at: timestamp with time zone (default)

### grocery_items
- id: uuid (pk)
- list_id: uuid (required, fk)
- product_id: uuid (fk)
- name: text (required)
- category: text
- quantity: numeric (default)
- unit: text
- notes: text
- is_checked: boolean (default)
- price: numeric
- added_by: uuid (required)
- sort_order: integer (default)

### grocery_sessions
- id: uuid (pk)
- started_by: uuid (required)
- store_name: text
- status: text (required)
- started_at: timestamp with time zone (default)
- completed_at: timestamp with time zone

### grocery_session_items
- id: uuid (pk)
- session_id: uuid (required, fk)
- grocery_item_id: uuid (fk)
- list_name: text (required)
- name: text (required)
- category: text
- quantity: numeric (default)
- unit: text
- notes: text
- is_purchased: boolean (default)
- purchased_at: timestamp with time zone
- price: numeric

### grocery_session_members
- id: uuid (pk)
- session_id: uuid (required, fk)
- user_id: uuid (required, fk)
- added_by: uuid (required)
- joined_at: timestamp with time zone (default)

### grocery_invitations
- id: uuid (pk)
- list_id: uuid (required, fk)
- invited_by: uuid (required)
- invited_email: text (required)
- status: text (default)
