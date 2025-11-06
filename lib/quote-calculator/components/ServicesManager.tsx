"use client";

import { useState } from "react";
import { AppSettings } from "../types/settings";
import { PricingCategory, LineItem } from "../types/pricing";
import { updateBrandCategories, getBrandCategories } from "../storage/settingsStorage";
import { BRANDS } from "../brands";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ChevronDown, ChevronUp, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

interface ServicesManagerProps {
  settings: AppSettings;
  onUpdate: () => void;
}

function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function ServicesManager({ settings, onUpdate }: ServicesManagerProps) {
  const [selectedBrand, setSelectedBrand] = useState<"ian-courtright" | "style-driven" | "voding">("ian-courtright");
  const [categories, setCategories] = useState<PricingCategory[]>(() => {
    return JSON.parse(JSON.stringify(settings.brandCategories[selectedBrand] || []));
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItem, setNewItem] = useState<Partial<LineItem>>({
    name: "",
    description: "",
    rate: 0,
    unit: "day",
  });

  const handleBrandChange = (brand: "ian-courtright" | "style-driven" | "voding") => {
    // Save current brand's categories before switching
    updateBrandCategories(selectedBrand, categories);
    setSelectedBrand(brand);
    const newCategories = JSON.parse(JSON.stringify(settings.brandCategories[brand] || []));
    setCategories(newCategories);
    setExpandedCategories(new Set());
    setEditingCategory(null);
    setEditingItem(null);
  };

  const handleSaveCategories = () => {
    updateBrandCategories(selectedBrand, categories);
    onUpdate();
    toast.success(`${BRANDS[selectedBrand].name} services updated`);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    const newCategory: PricingCategory = {
      id: generateUUID(),
      name: newCategoryName.trim(),
      items: [],
    };
    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setExpandedCategories(new Set([...expandedCategories, newCategory.id]));
    toast.success("Category added");
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Delete this category and all its items?")) {
      setCategories(categories.filter((cat) => cat.id !== categoryId));
      toast.success("Category deleted");
    }
  };

  const handleUpdateCategoryName = (categoryId: string, name: string) => {
    setCategories(
      categories.map((cat) => (cat.id === categoryId ? { ...cat, name } : cat))
    );
  };

  const handleAddItem = (categoryId: string) => {
    if (!newItem.name?.trim() || !newItem.rate) {
      toast.error("Please fill in item name and rate");
      return;
    }
    const item: LineItem = {
      id: generateUUID(),
      name: newItem.name.trim(),
      description: newItem.description || "",
      quantity: 0,
      rate: newItem.rate || 0,
      unit: newItem.unit || "day",
      enabled: false,
    };
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, items: [...cat.items, item] } : cat
      )
    );
    setNewItem({ name: "", description: "", rate: 0, unit: "day" });
    toast.success("Service item added");
  };

  const handleUpdateItem = (categoryId: string, itemId: string, updates: Partial<LineItem>) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : cat
      )
    );
  };

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    if (confirm("Delete this service item?")) {
      setCategories(
        categories.map((cat) =>
          cat.id === categoryId
            ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
            : cat
        )
      );
      toast.success("Service item deleted");
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const currentBrand = BRANDS[selectedBrand];
  const isStyleDriven = selectedBrand === "style-driven";

  return (
    <div className="space-y-6">
      {/* Brand Selector */}
      <Card className="border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-wider">
            Manage Services by Brand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="text-sm font-bold uppercase tracking-wider">Select Brand:</Label>
            <Select value={selectedBrand} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ian-courtright">Ian Courtright</SelectItem>
                <SelectItem value="style-driven">Style Driven</SelectItem>
                <SelectItem value="voding">Voding</SelectItem>
              </SelectContent>
            </Select>
            {isStyleDriven && (
              <span className="text-sm text-foreground/60 italic">
                (Style Driven uses production seed data - editable but considered final)
              </span>
            )}
            <Button
              onClick={handleSaveCategories}
              className="ml-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: currentBrand.secondaryColor, color: currentBrand.primaryColor, fontWeight: '900' }}
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add New Category */}
      <Card className="border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-wider">
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g., 'Development', 'Design')"
              className="flex-1"
            />
            <Button
              onClick={handleAddCategory}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <Card className="border border-foreground/20">
            <CardContent className="py-8 text-center">
              <p className="text-foreground/60">No categories yet. Add one above.</p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id} className="border border-foreground/20">
              <CardHeader
                className="cursor-pointer hover:bg-foreground/5 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedCategories.has(category.id) ? (
                      <ChevronUp className="h-5 w-5 text-foreground/60" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-foreground/60" />
                    )}
                    {editingCategory === category.id ? (
                      <Input
                        value={category.name}
                        onChange={(e) => handleUpdateCategoryName(category.id, e.target.value)}
                        onBlur={() => setEditingCategory(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingCategory(null);
                        }}
                        className="font-bold text-lg w-64"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="text-lg font-bold uppercase tracking-wider"
                        onDoubleClick={() => setEditingCategory(category.id)}
                      >
                        {category.name}
                      </h3>
                    )}
                    <span className="text-sm text-foreground/60">
                      ({category.items.length} items)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingCategory(category.id)}
                      variant="outline"
                      size="sm"
                      className="font-bold uppercase tracking-wider text-xs"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCategory(category.id)}
                      variant="destructive"
                      size="sm"
                      className="font-bold uppercase tracking-wider text-xs"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedCategories.has(category.id) && (
                <CardContent className="space-y-4">
                  {/* Add New Item */}
                  <div className="border border-foreground/10 rounded-lg p-4 bg-foreground/5">
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-3">
                      Add New Service Item
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                          Service Name
                        </Label>
                        <Input
                          value={newItem.name || ""}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="e.g., Full-Stack Development"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                          Rate
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItem.rate || 0}
                          onChange={(e) =>
                            setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                          Unit
                        </Label>
                        <Select
                          value={newItem.unit || "day"}
                          onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="hour">Hour</SelectItem>
                            <SelectItem value="flat">Flat</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="version">Version</SelectItem>
                            <SelectItem value="language">Language</SelectItem>
                            <SelectItem value="format">Format</SelectItem>
                            <SelectItem value="clip">Clip</SelectItem>
                            <SelectItem value="person/day">Person/Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                          Description (optional)
                        </Label>
                        <Input
                          value={newItem.description || ""}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                          placeholder="Brief description..."
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddItem(category.id)}
                      className="mt-3 font-bold uppercase tracking-wider text-xs"
                      size="sm"
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Add Item
                    </Button>
                  </div>

                  {/* Existing Items */}
                  <div className="space-y-2">
                    {category.items.length === 0 ? (
                      <p className="text-sm text-foreground/60 text-center py-4">
                        No service items yet. Add one above.
                      </p>
                    ) : (
                      category.items.map((item) => (
                        <div
                          key={item.id}
                          className="border border-foreground/10 rounded-lg p-3 bg-foreground/5"
                        >
                          {editingItem === item.id ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                                  Name
                                </Label>
                                <Input
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateItem(category.id, item.id, { name: e.target.value })
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                                  Rate
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.rate}
                                  onChange={(e) =>
                                    handleUpdateItem(category.id, item.id, {
                                      rate: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                                  Unit
                                </Label>
                                <Select
                                  value={item.unit}
                                  onValueChange={(value) =>
                                    handleUpdateItem(category.id, item.id, { unit: value })
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="day">Day</SelectItem>
                                    <SelectItem value="hour">Hour</SelectItem>
                                    <SelectItem value="flat">Flat</SelectItem>
                                    <SelectItem value="month">Month</SelectItem>
                                    <SelectItem value="item">Item</SelectItem>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="version">Version</SelectItem>
                                    <SelectItem value="language">Language</SelectItem>
                                    <SelectItem value="format">Format</SelectItem>
                                    <SelectItem value="clip">Clip</SelectItem>
                                    <SelectItem value="person/day">Person/Day</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs font-bold uppercase tracking-wider mb-1 block">
                                  Description
                                </Label>
                                <Input
                                  value={item.description || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(category.id, item.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="md:col-span-2 flex gap-2">
                                <Button
                                  onClick={() => setEditingItem(null)}
                                  variant="outline"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  <Save className="mr-2 h-3 w-3" />
                                  Save
                                </Button>
                                <Button
                                  onClick={() => setEditingItem(null)}
                                  variant="ghost"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  <X className="mr-2 h-3 w-3" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold">{item.name}</span>
                                  <span className="text-sm text-foreground/60">
                                    {item.rate.toLocaleString("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                    })}{" "}
                                    / {item.unit}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-foreground/60 mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setEditingItem(item.id)}
                                  variant="outline"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteItem(category.id, item.id)}
                                  variant="destructive"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}






