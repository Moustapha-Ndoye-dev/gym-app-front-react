import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Search, CreditCard, ShoppingCart, Settings, Package, Edit, Trash2, X, PlusCircle, AlertCircle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useConfirm } from '../context/ConfirmContext';
import axiosInstance from '../api/axiosInstance';
import { getApiErrorMessage } from '../lib/getApiErrorMessage';
import { STRING_LIMITS } from '../lib/stringLimits';

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  photo?: string;
};

export const Shop: React.FC = () => {
  const [mode, setMode] = useState<'sell' | 'manage'>('sell');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['Tous']);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { showNotification } = useNotification();
  const { confirm } = useConfirm();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await axiosInstance.get('/api/products');
      setProducts(res.data || []);
      setCategories(
        res.data && res.data.length > 0
          ? [
              'Tous',
              ...(Array.from(
                new Set(res.data.map((p: Product) => p.category).filter(Boolean))
              ) as string[]),
            ]
          : ['Tous']
      );
    } catch (error: unknown) {
      setProducts([]);
      setCategories(['Tous']);
      showNotification(
        getApiErrorMessage(error, 'Chargement des produits'),
        'error'
      );
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setCurrentProduct({ ...currentProduct, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = String(currentProduct.name ?? '').trim();
    const category = String(currentProduct.category ?? '').trim();
    if (
      name.length < STRING_LIMITS.labelName.min ||
      name.length > STRING_LIMITS.labelName.max
    ) {
      showNotification(
        `Nom du produit : entre ${STRING_LIMITS.labelName.min} et ${STRING_LIMITS.labelName.max} caractères.`,
        'error'
      );
      return;
    }
    if (category.length > STRING_LIMITS.productCategory.max) {
      showNotification(
        `Catégorie : ${STRING_LIMITS.productCategory.max} caractères maximum.`,
        'error'
      );
      return;
    }
    const price = Number(currentProduct.price);
    if (!Number.isFinite(price) || price <= 0) {
      showNotification('Indiquez un prix valide supérieur à 0.', 'error');
      return;
    }
    const method = currentProduct.id ? 'put' : 'post';
    const url = currentProduct.id ? `/api/products/${currentProduct.id}` : '/api/products';
    const payload = {
      ...currentProduct,
      name,
      category: category || undefined,
      price,
      stock:
        currentProduct.stock === undefined || currentProduct.stock === null
          ? 0
          : Number(currentProduct.stock),
    };
    try {
      await axiosInstance[method](url, payload);
      setIsModalOpen(false);
      fetchProducts();
      showNotification('Produit enregistré', 'success');
    } catch (error: unknown) {
      showNotification(
        getApiErrorMessage(error, 'Enregistrement du produit'),
        'error'
      );
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategory === 'Tous' || p.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showNotification('Stock insuffisant', 'warning');
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (newQty > item.product.stock) {
          showNotification('Stock maximum atteint', 'warning');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    confirm({
      title: 'Encaisser la vente',
      message: `Total : ${cartTotal.toLocaleString()} CFA. Valider ?`,
      onConfirm: async () => {
        try {
          await axiosInstance.post('/api/transactions', {
            amount: cartTotal,
            type: 'income',
            description: `Vente boutique: ${cart.map(c => `${c.quantity}x ${c.product.name}`).join(', ')}`,
            items: cart.map(c => ({ id: c.product.id, quantity: c.quantity }))
          });
          setCart([]);
          fetchProducts();
          showNotification('Vente et stock mis à jour', 'success');
        } catch (error: unknown) {
          showNotification(
            getApiErrorMessage(error, 'Encaissement de la vente'),
            'error'
          );
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 text-slate-900 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><ShoppingBag className="h-5 w-5" /></div>
          <h1 className="text-lg font-black tracking-tight uppercase">Boutique <span className="text-indigo-600 font-bold">Pro</span></h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setMode('sell')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'sell' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Vente</button>
          <button onClick={() => setMode('manage')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'manage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Stock</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-100 overflow-x-auto">
              {categories.map(cat => (
                <button key={cat} onClick={() => {setActiveCategory(cat); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{cat}</button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>

          {mode === 'sell' ? (
            <>
              {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {paginatedProducts.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all group animate-in fade-in zoom-in duration-300">
                      <div className="h-24 bg-slate-50 relative flex items-center justify-center p-2">
                        {p.photo ? <img src={p.photo} className="h-full object-contain group-hover:scale-110 transition-transform duration-500" /> : <Package className="h-8 w-8 text-slate-200" />}
                        <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg text-[8px] font-black border uppercase shadow-sm ${p.stock > 0 ? 'bg-white text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {p.stock > 0 ? `Stock: ${p.stock}` : 'EPUISE'}
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <h3 className="text-[11px] font-black text-slate-900 leading-tight line-clamp-1">{p.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-black text-indigo-600">{p.price.toLocaleString()} CFA</span>
                          <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-30 transition-all shadow-md"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-[12px] font-black text-slate-900">
                    {products.length === 0
                      ? 'Aucun produit en boutique pour le moment.'
                      : 'Aucun produit ne correspond a votre recherche.'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">
                    {products.length === 0
                      ? 'Ajoutez d abord un produit dans l onglet Stock.'
                      : 'Essayez une autre recherche ou une autre categorie.'}
                  </p>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center gap-1.5 pt-4">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{i + 1}</button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Inventaire des Produits</h3>
                <button onClick={() => {setCurrentProduct({}); setPhotoPreview(null); setIsModalOpen(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md transition-all">Nouveau Produit</button>
              </div>
              {paginatedProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prix</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedProducts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-slate-100 p-1 flex items-center justify-center shrink-0">{p.photo ? <img src={p.photo} className="h-full object-contain" /> : <Package className="h-4 w-4 text-slate-300" />}</div><span className="text-[12px] font-bold">{p.name}</span></div></td>
                          <td className="p-4 text-right text-[12px] font-black">{p.price.toLocaleString()}</td>
                          <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${p.stock < 5 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>{p.stock}</span></td>
                          <td className="p-4 text-right flex justify-end gap-1">
                            <button onClick={() => {setCurrentProduct(p); setPhotoPreview(p.photo || null); setIsModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => confirm({ title: 'Supprimer', message: "Supprimer ce produit ?", onConfirm: async () => { await axiosInstance.delete(`/api/products/${p.id}`); fetchProducts(); } })} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-[12px] font-black text-slate-900">
                    {products.length === 0
                      ? 'Aucun produit en stock pour le moment.'
                      : 'Aucun produit ne correspond a votre recherche.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {mode === 'sell' && (
          <div className="w-full lg:w-[300px] bg-white rounded-3xl border border-slate-100 shadow-xl p-5 flex flex-col h-fit sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[13px] font-black uppercase tracking-wider flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-indigo-600" /> Panier</h2>
              <button onClick={() => setCart([])} className="text-[9px] font-bold text-slate-400 hover:text-rose-500 uppercase">Vider</button>
            </div>
            <div className="space-y-4 max-h-[350px] overflow-y-auto mb-6 scrollbar-none pr-1">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black truncate text-slate-900">{item.product.name}</p>
                    <p className="text-[10px] font-bold text-indigo-600">{item.product.price.toLocaleString()} CFA</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => updateCartQuantity(item.product.id, -1)} className="p-0.5 text-slate-400 hover:text-rose-500"><Minus className="h-3 w-3" /></button>
                    <span className="text-[11px] font-black w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.product.id, 1)} className="p-0.5 text-slate-400 hover:text-indigo-600"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-10 text-center space-y-2 opacity-40">
                  <ShoppingCart className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-[10px] font-bold uppercase">Panier vide</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-5 space-y-5">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase">Total à payer</p>
                <p className="text-2xl font-black tracking-tighter">{cartTotal.toLocaleString()} <span className="text-xs">CFA</span></p>
              </div>
              <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-20 transition-all shadow-xl shadow-slate-200">Valider l'encaissement</button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full shadow-2xl relative">
            <h2 className="text-lg font-black uppercase mb-6 tracking-tight">{currentProduct.id ? 'Modifier' : 'Nouveau'}</h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-lg bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                  {photoPreview || currentProduct.photo ? <img src={photoPreview || currentProduct.photo} className="h-full object-contain" /> : <PlusCircle className="h-4 w-4 text-slate-300" />}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400">Image</p>
              </div>
              <input required placeholder="Nom du produit" minLength={STRING_LIMITS.labelName.min} maxLength={STRING_LIMITS.labelName.max} value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" placeholder="Prix" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none" />
                <input required type="number" placeholder="Stock" value={currentProduct.stock || ''} onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none" />
              </div>
              <input placeholder="Catégorie" maxLength={STRING_LIMITS.productCategory.max} value={currentProduct.category || ''} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-[10px] font-black uppercase text-slate-400">Annuler</button>
                <button type="submit" className="flex-[2] py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 shadow-lg">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
