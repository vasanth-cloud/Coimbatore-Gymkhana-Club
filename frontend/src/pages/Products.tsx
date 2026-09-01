import React, { useEffect, useState } from 'react';
import { brandApi, productApi } from '../api/services';
import { Brand, Product } from '../types';
import {
  Plus,
  Minus,
  Tag,
  GlassWater,
  Check,
  Loader2,
  Search,
  Edit2,
  Trash2,
  X,
  FolderTree,
  Layers,
  Filter,
} from 'lucide-react';

const CATEGORIES = [
  'Whisky',
  'Whiskey',
  'Beer',
  'Wine',
  'Vodka',
  'Rum',
  'Tequila',
  'Gin',
  'Brandy',
  'Soft Drink',
  'Other',
];

export const Products: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'brands'>('products');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout & Form Toggle
  const [showAddForm, setShowAddForm] = useState(false);

  // Grouping & Search & Filter States
  const [groupBy, setGroupBy] = useState<'category' | 'size'>('category');
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandFormFilter, setBrandFormFilter] = useState<string>('ALL');

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductBrandId, setEditProductBrandId] = useState<number>(0);
  const [editProductCategory, setEditProductCategory] = useState(CATEGORIES[0]);
  const [editProductVolume, setEditProductVolume] = useState<number>(750);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  // Edit brand modal state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandCategory, setEditBrandCategory] = useState(CATEGORIES[0]);
  const [brandUpdateSubmitting, setBrandUpdateSubmitting] = useState(false);

  // Brand form state
  const [brandName, setBrandName] = useState('');
  const [brandCategory, setBrandCategory] = useState(CATEGORIES[0]);
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const [brandMsg, setBrandMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Product form state
  const [productBrandId, setProductBrandId] = useState<number>(0);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(CATEGORIES[0]);
  const [productVolume, setProductVolume] = useState<number>(750);
  const [productUnit, setProductUnit] = useState('bottle');
  const [productSellingPrice, setProductSellingPrice] = useState<number>(500);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productMsg, setProductMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [brandData, productData] = await Promise.all([
        brandApi.getBrands(),
        productApi.getProducts(),
      ]);
      setBrands(brandData);
      setProducts(productData);
      if (brandData.length > 0 && productBrandId === 0) {
        setProductBrandId(brandData[0].id);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandMsg(null);
    setBrandSubmitting(true);

    try {
      const newBrand = await brandApi.createBrand({
        name: brandName,
        category: brandCategory,
      });
      setBrands((prev) => [...prev, newBrand]);
      setBrandMsg({ type: 'success', text: `Brand "${newBrand.name}" saved!` });
      setBrandName('');
      if (productBrandId === 0) setProductBrandId(newBrand.id);
    } catch (err: any) {
      setBrandMsg({ type: 'error', text: err.response?.data?.detail || 'Could not save brand' });
    } finally {
      setBrandSubmitting(false);
    }
  };

  const handleOpenEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setEditBrandName(brand.name);
    setEditBrandCategory(brand.category);
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    setBrandUpdateSubmitting(true);

    try {
      const updated = await brandApi.updateBrand(editingBrand.id, {
        name: editBrandName,
        category: editBrandCategory,
      });
      setBrands((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setEditingBrand(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not update brand');
    } finally {
      setBrandUpdateSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId: number, brandName: string) => {
    if (!window.confirm(`Are you sure you want to delete brand "${brandName}"?`)) {
      return;
    }

    try {
      await brandApi.deleteBrand(brandId);
      setBrands((prev) => prev.filter((b) => b.id !== brandId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete brand');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductMsg(null);
    if (!productBrandId) {
      setProductMsg({ type: 'error', text: 'Please add/select a brand first' });
      return;
    }
    setProductSubmitting(true);

    try {
      const newProduct = await productApi.createProduct({
        brand_id: productBrandId,
        name: productName,
        category: productCategory,
        volume_ml: productVolume,
        unit: productUnit,
        selling_price: productSellingPrice,
      });
      setProducts((prev) => [newProduct, ...prev]);
      setProductMsg({ type: 'success', text: `Drink "${newProduct.name}" added to menu catalog!` });
      setProductName('');
      setShowAddForm(false);
    } catch (err: any) {
      setProductMsg({ type: 'error', text: err.response?.data?.detail || 'Could not add product' });
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditProductName(prod.name);
    setEditProductBrandId(prod.brand_id);
    setEditProductCategory(prod.category || CATEGORIES[0]);
    setEditProductVolume(prod.volume_ml || 750);
    setEditPrice(prod.selling_price ?? 0);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setPriceSubmitting(true);

    try {
      const updated = await productApi.updateProduct(editingProduct.id, {
        name: editProductName,
        brand_id: editProductBrandId,
        category: editProductCategory,
        volume_ml: editProductVolume,
        selling_price: editPrice,
      });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProduct(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not update product');
    } finally {
      setPriceSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete drink "${productName}" from the menu catalog?`)) {
      return;
    }

    try {
      await productApi.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete product');
    }
  };

  // Enrich products with volume_ml and category
  const enrichedProducts = products.map((p) => {
    const brand = brands.find((b) => b.id === p.brand_id);
    return {
      ...p,
      brand_name: brand?.name || 'Generic',
      category: p.category || brand?.category || 'Other',
      volume_ml: p.volume_ml || 750,
      unit: p.unit || 'bottle',
    };
  });

  const categoryPillList = Array.from(new Set(enrichedProducts.map((p) => p.category)));
  const sizePillList = Array.from(new Set(enrichedProducts.map((p) => p.volume_ml))).sort((a, b) => a - b);

  // Filter enriched products by search term AND horizontal category/size pill
  const filteredProducts = enrichedProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      `${p.volume_ml}ml`.toLowerCase().includes(search.toLowerCase());

    const matchesPill =
      selectedCategoryPill === 'ALL' ||
      (groupBy === 'category' && p.category.toLowerCase() === selectedCategoryPill.toLowerCase()) ||
      (groupBy === 'size' && `${p.volume_ml}` === selectedCategoryPill);

    return matchesSearch && matchesPill;
  });

  // Filter brands by brand search term
  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
      b.category.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const filteredFormProducts = brandFormFilter === 'ALL'
    ? products
    : products.filter((p) => p.brand_id === Number(brandFormFilter));

  const renderProductCard = (p: (typeof enrichedProducts)[0]) => (
    <div
      key={p.id}
      className="bg-[#0d1117] border border-[#21262d] p-4 rounded-2xl flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-sm group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-extrabold uppercase text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 font-mono">
            {p.category}
          </span>
          <span className="text-[10px] font-bold font-mono text-slate-300 bg-[#21262d] px-2 py-0.5 rounded-md">
            {p.volume_ml} ml
          </span>
        </div>
        <h4 className="text-base font-extrabold text-slate-100 group-hover:text-amber-400 transition-colors">
          {p.name}
        </h4>
        <span className="text-xs font-semibold text-slate-400 block mt-0.5">
          Brand: {p.brand_name}
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-[#21262d] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
            Selling Price
          </span>
          <span className="text-xl font-black font-mono text-amber-400">
            ₹{p.selling_price ?? 0}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEditProduct(p)}
            className="p-2 bg-[#21262d] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
            title="Edit Drink Details"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => handleDeleteProduct(p.id, p.name)}
            className="p-2 bg-[#21262d] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
            title="Delete Drink from Catalog"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Title and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Bar Menu & Product Pricing
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Horizontal classified drinks menu catalog with instant search & brand management
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 text-xs tracking-wide flex items-center justify-center gap-2 transition-all shrink-0"
        >
          {showAddForm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'HIDE FORM' : '+ ADD NEW DRINK / BOTTLE'}</span>
        </button>
      </div>

      {/* Collapsible Add New Drink Form */}
      {showAddForm && (
        <div className="bg-[#161b22] border border-amber-500/40 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <h3 className="text-base font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <GlassWater className="w-5 h-5" /> Add New Drink / Bottle to Bar Menu
            </h3>
            <span className="text-xs text-slate-400">Expand menu offerings</span>
          </div>

          {productMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                productMsg.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {productMsg.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{productMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Select Brand
              </label>
              <select
                value={productBrandId}
                onChange={(e) => setProductBrandId(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold text-xs focus:outline-none focus:border-amber-500"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Drink / Bottle Name
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Black Label 12 Yrs, Kingfisher Premium"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 font-semibold text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Category
              </label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold text-xs focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Bottle Size (ml)
              </label>
              <input
                type="number"
                required
                min={50}
                value={productVolume}
                onChange={(e) => setProductVolume(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                required
                min={0}
                value={productSellingPrice}
                onChange={(e) => setProductSellingPrice(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-amber-400 font-mono font-extrabold text-sm focus:outline-none"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={productSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {productSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>ADD DRINK TO CATALOG</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation View Selector: Bar Menu Catalog vs Brands Management */}
      <div className="flex bg-[#161b22] p-1.5 rounded-2xl border border-[#21262d]">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GlassWater className="w-4 h-4 stroke-[2.5]" />
          <span>Bar Menu Catalog ({products.length} Drinks)</span>
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'brands'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4 stroke-[2.5]" />
          <span>Brands & Categories ({brands.length})</span>
        </button>
      </div>

      {/* VIEW 1: BAR MENU CATALOG (With Horizontal Classification Pills Bar) */}
      {activeTab === 'products' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg space-y-5">
          
          {/* Controls Bar: Search + Group Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drink name, brand, category, or bottle size..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Toggle: Classify By Category vs By Bottle Size */}
            <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d] self-start sm:self-auto">
              <button
                onClick={() => {
                  setGroupBy('category');
                  setSelectedCategoryPill('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  groupBy === 'category'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>By Category</span>
              </button>

              <button
                onClick={() => {
                  setGroupBy('size');
                  setSelectedCategoryPill('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  groupBy === 'size'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>By Bottle Size</span>
              </button>
            </div>
          </div>

          {/* HORIZONTAL CLASSIFICATION PILLS BAR */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              {groupBy === 'category' ? 'Filter By Category:' : 'Filter By Bottle Size:'}
            </span>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryPill('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                  selectedCategoryPill === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                }`}
              >
                🌟 ALL DRINKS ({products.length})
              </button>

              {groupBy === 'category'
                ? categoryPillList.map((cat) => {
                    const count = products.filter((p) => p.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategoryPill(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                          selectedCategoryPill.toLowerCase() === cat.toLowerCase()
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })
                : sizePillList.map((sz) => {
                    const count = products.filter((p) => p.volume_ml === sz).length;
                    return (
                      <button
                        key={sz}
                        onClick={() => setSelectedCategoryPill(`${sz}`)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                          selectedCategoryPill === `${sz}`
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                        }`}
                      >
                        {sz} ml Bottles ({count})
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Menu Catalog Grid */}
          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span>Loading bar menu catalog...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
              No drinks match your search or selected pill filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredProducts.map((p) => renderProductCard(p))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: BRANDS WITH EDIT & DELETE BUTTONS */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Brand Form */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 h-fit shadow-lg">
            <h3 className="text-base font-extrabold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Tag className="w-5 h-5" /> Add Brand
            </h3>
            <p className="text-xs text-slate-400 mb-5">Create a brand name for grouping drinks</p>

            {brandMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  brandMsg.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {brandMsg.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
                <span>{brandMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Johnnie Walker, Heineken"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-3 text-slate-100 placeholder-slate-600 font-semibold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Category
                </label>
                <select
                  value={brandCategory}
                  onChange={(e) => setBrandCategory(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-3 text-slate-100 font-semibold text-sm focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={brandSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-2"
              >
                {brandSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>SAVE BRAND</span>
              </button>
            </form>
          </div>

          {/* Registered Brands List with Edit & Delete Actions & Live Search */}
          <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
              <h3 className="text-base font-extrabold text-slate-200 uppercase tracking-wider">
                Registered Brands ({filteredBrands.length})
              </h3>

              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Search brand name or category..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-8 py-2 text-slate-100 placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
                {brandSearch && (
                  <button
                    onClick={() => setBrandSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {filteredBrands.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
                No brands match "{brandSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[550px] overflow-y-auto pr-1">
                {filteredBrands.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl flex items-center justify-between hover:border-amber-500/40 transition-all"
                  >
                    <div>
                      <h4 className="text-base font-extrabold text-slate-100">{b.name}</h4>
                      <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block mt-1">
                        {b.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditBrand(b)}
                        className="p-2 rounded-lg bg-[#21262d] hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors"
                        title="Edit Brand"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBrand(b.id, b.name)}
                        className="p-2 rounded-lg bg-[#21262d] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                        title="Delete Brand"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-sm w-full relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setEditingBrand(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-100 mb-1">Edit Brand</h3>
            <p className="text-xs text-slate-400 mb-4">Modify brand details</p>

            <form onSubmit={handleUpdateBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-3 text-slate-100 font-semibold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Category
                </label>
                <select
                  value={editBrandCategory}
                  onChange={(e) => setEditBrandCategory(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-3 text-slate-100 font-semibold text-sm focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={brandUpdateSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {brandUpdateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>UPDATE BRAND</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full Edit Drink / Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-100 mb-1">Edit Drink Details</h3>
            <p className="text-xs text-slate-400 mb-4">{editingProduct.name}</p>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Drink Name
                </label>
                <input
                  type="text"
                  required
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Select Brand
                  </label>
                  <select
                    value={editProductBrandId}
                    onChange={(e) => setEditProductBrandId(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold text-xs focus:outline-none focus:border-amber-500"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={editProductCategory}
                    onChange={(e) => setEditProductCategory(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold text-xs focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Bottle Size (ml)
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={editProductVolume}
                    onChange={(e) => setEditProductVolume(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-amber-400 font-mono font-black text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={priceSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {priceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>UPDATE DRINK DETAILS</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
