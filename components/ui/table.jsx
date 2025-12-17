// components/ui/table.jsx
// Reusable table components extracted from student-view.js

export const Table = ({ children, className = "" }) => (
    <div className={`w-full ${className}`}>
        <table className="min-w-full divide-y divide-slate-200/80">{children}</table>
    </div>
);

export const TableHeader = ({ children, className = "" }) => (
    <thead className={className}>{children}</thead>
);

export const TableHead = ({ children, className = "" }) => (
    <th className={`px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider ${className}`}>
        {children}
    </th>
);

export const TableBody = ({ children }) => (
    <tbody className="divide-y divide-slate-100">{children}</tbody>
);

export const TableRow = ({ children, className = "" }) => (
    <tr className={`hover:bg-slate-50/50 ${className}`}>{children}</tr>
);

export const TableCell = ({ children, className = "", colSpan }) => (
    <td className={`px-4 py-3 whitespace-nowrap ${className}`} colSpan={colSpan}>
        {children}
    </td>
);
