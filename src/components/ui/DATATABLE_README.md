# Generic DataTable Component

A highly flexible and reusable data table component that supports multiple display variants, custom columns, actions, and pagination.

## Features

- **Multiple Variants**: Table, Cards, and List views
- **Customizable Columns**: Define custom render functions for each column
- **Action Menus**: Dropdown menus with custom actions
- **Pagination**: Built-in pagination with customizable controls
- **Loading States**: Skeleton loading animations
- **Empty States**: Customizable empty state messages
- **Responsive Design**: Works on all screen sizes
- **TypeScript Support**: Full type safety
- **Accessibility**: ARIA compliant with keyboard navigation

## Basic Usage

```tsx
import DataTable, { Column, Action } from '@/components/ui/data-table';

const columns: Column<MyDataType>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (item) => <span>{item.name}</span>
  },
  {
    key: 'email',
    label: 'Email',
    render: (item) => <span>{item.email}</span>
  }
];

const actions: Action<MyDataType>[] = [
  {
    key: 'edit',
    label: 'Edit',
    icon: <Edit className="w-4 h-4" />,
    onClick: (item) => console.log('Edit', item)
  }
];

<DataTable
  data={myData}
  columns={columns}
  actions={actions}
  variant="table"
  pagination={{
    page: 1,
    limit: 10,
    total: 100,
    pages: 10,
    onPageChange: (page) => setPage(page)
  }}
/>
```

## Props

### DataTableProps<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | - | Array of data items to display |
| `columns` | `Column<T>[]` | - | Column definitions |
| `actions` | `Action<T>[]` | `[]` | Action menu items |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `emptyState` | `object` | - | Custom empty state |
| `pagination` | `object` | - | Pagination configuration |
| `variant` | `'table' \| 'cards' \| 'list'` | `'cards'` | Display variant |
| `className` | `string` | `''` | Additional CSS classes |
| `rowClassName` | `string \| function` | `''` | Row CSS classes |
| `onRowClick` | `function` | - | Row click handler |
| `selectable` | `boolean` | `false` | Enable row selection |
| `selectedItems` | `T[]` | `[]` | Selected items |
| `onSelectionChange` | `function` | - | Selection change handler |
| `getItemId` | `function` | `(item) => item.id \|\| item._id` | Get unique item ID |

### Column<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | - | Unique column key |
| `label` | `string` | - | Column header label |
| `sortable` | `boolean` | `false` | Enable sorting |
| `render` | `function` | - | Custom render function |
| `className` | `string` | - | Column CSS classes |
| `headerClassName` | `string` | - | Header CSS classes |
| `width` | `string` | - | Column width |

### Action<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | - | Unique action key |
| `label` | `string \| function` | - | Action label |
| `icon` | `ReactNode` | - | Action icon |
| `onClick` | `function` | - | Click handler |
| `variant` | `'default' \| 'destructive' \| 'secondary'` | `'default'` | Action style |
| `className` | `string` | - | Action CSS classes |

## Variants

### Table Variant
Best for displaying tabular data with many columns.

```tsx
<DataTable
  data={data}
  columns={columns}
  variant="table"
/>
```

**Features:**
- Header row with column labels
- Full-width layout
- Best for desktop viewing
- Supports many columns

### Cards Variant
Best for displaying rich content with images and detailed information.

```tsx
<DataTable
  data={data}
  columns={columns}
  variant="cards"
/>
```

**Features:**
- Grid layout (responsive)
- Rich content display
- Great for mobile
- Visual emphasis

### List Variant
Best for simple lists with minimal information.

```tsx
<DataTable
  data={data}
  columns={columns}
  variant="list"
/>
```

**Features:**
- Compact vertical layout
- Minimal spacing
- Good for simple data
- Space efficient

## Examples

### Basic Table

```tsx
const columns: Column<User>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (user) => (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
          {user.name.charAt(0)}
        </div>
        <span className="font-medium">{user.name}</span>
      </div>
    )
  },
  {
    key: 'email',
    label: 'Email',
    render: (user) => <span className="text-gray-600">{user.email}</span>
  },
  {
    key: 'role',
    label: 'Role',
    render: (user) => (
      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
        {user.role}
      </Badge>
    )
  }
];

const actions: Action<User>[] = [
  {
    key: 'edit',
    label: 'Edit User',
    icon: <Edit className="w-4 h-4" />,
    onClick: (user) => handleEdit(user)
  },
  {
    key: 'delete',
    label: 'Delete User',
    icon: <Trash2 className="w-4 h-4" />,
    onClick: (user) => handleDelete(user.id),
    variant: 'destructive'
  }
];

<DataTable
  data={users}
  columns={columns}
  actions={actions}
  variant="table"
  pagination={{
    page: currentPage,
    limit: 10,
    total: totalUsers,
    pages: totalPages,
    onPageChange: setCurrentPage
  }}
/>
```

### Cards with Custom Styling

```tsx
<DataTable
  data={products}
  columns={productColumns}
  actions={productActions}
  variant="cards"
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  rowClassName={(product) => 
    product.featured ? 'ring-2 ring-yellow-400' : ''
  }
  onRowClick={(product) => navigateToProduct(product.id)}
/>
```

### List with Selection

```tsx
<DataTable
  data={items}
  columns={columns}
  variant="list"
  selectable
  selectedItems={selectedItems}
  onSelectionChange={setSelectedItems}
  getItemId={(item) => item.uuid}
/>
```

## Customization

### Custom Empty State

```tsx
<DataTable
  data={data}
  columns={columns}
  emptyState={{
    title: 'No items found',
    description: 'Try adjusting your search criteria.',
    icon: <Search className="w-10 h-10 text-gray-400" />
  }}
/>
```

### Custom Row Styling

```tsx
<DataTable
  data={data}
  columns={columns}
  rowClassName={(item, index) => 
    item.isActive 
      ? 'bg-green-50 border-green-200' 
      : 'bg-gray-50 border-gray-200'
  }
/>
```

### Dynamic Actions

```tsx
const actions: Action<User>[] = [
  {
    key: 'toggle-status',
    label: (user) => user.isActive ? 'Deactivate' : 'Activate',
    icon: (user) => user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />,
    onClick: (user) => toggleUserStatus(user.id)
  }
];
```

## Styling

The component uses Tailwind CSS classes and can be customized through:

- **className prop**: Add custom classes to the container
- **rowClassName prop**: Style individual rows
- **Column className**: Style specific columns
- **Action className**: Style action buttons

## Best Practices

1. **Use appropriate variants** for your data type
2. **Keep columns focused** and not too wide
3. **Use custom render functions** for complex content
4. **Provide meaningful action labels** and icons
5. **Handle loading and empty states** appropriately
6. **Use TypeScript** for better type safety
7. **Test on different screen sizes** for responsive design

## Performance

- **Virtual scrolling** for large datasets (coming soon)
- **Efficient re-renders** with proper React patterns
- **Optimized hover states** for smooth interactions
- **Lazy loading** support for pagination

## Accessibility

- **Keyboard navigation** support
- **Screen reader** compatibility
- **ARIA labels** and roles
- **Focus management** for modals and dropdowns
- **High contrast** support
