export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="-mx-4 flex min-h-full flex-1 flex-col sm:-mx-6 lg:-mx-8">
      {children}
    </div>
  );
}
