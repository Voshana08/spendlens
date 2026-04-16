import { CategoriesSection } from "@/components/settings/categories-section";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <CategoriesSection />
    </div>
  );
}
