"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { getUsers, createUser } from "@/api/user.api";
import { getProducts, getProductOptions, getOptionValues } from "@/api/product.api";
import { createManualOrder } from "@/api/order.api";
import Modal from "@/components/ui/Modal";
import FormField, { inputClass } from "@/components/ui/FormField";
import { extractList } from "@/utils/extractList";
import { formatCurrency } from "@/utils/format";

const PAYMENT_METHODS = ["Cash", "UPI", "Card"];

export default function ManualOrderPage() {
    const router = useRouter();

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [customerId, setCustomerId] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    // selections maps optionId -> valueId for the line's product
    const [items, setItems] = useState([{ productId: "", qty: 1, selections: {} }]);
    // productId -> [{ ...option, values }], fetched the first time a product is picked
    const [optionsByProduct, setOptionsByProduct] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [customerError, setCustomerError] = useState("");

    const loadOptions = async () => {
        try {
            const [userRes, productRes] = await Promise.all([
                getUsers({ limit: 1000 }),
                getProducts({ limit: 500 })
            ]);

            setCustomers(extractList(userRes?.data, ["users", "user"]));
            setProducts(extractList(productRes?.data, ["products", "product"]));
        } catch (err) {
            setError(err.message || "Failed to load customers/products");
        }
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [userRes, productRes] = await Promise.all([
                    getUsers(),
                    getProducts({ limit: 500 })
                ]);

                if (!cancelled) {
                    setCustomers(extractList(userRes?.data, ["users", "user"]));
                    setProducts(
                        extractList(productRes?.data, ["products", "product"])
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load customers/products");
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const updateItem = (index, field, value) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    // Only options with stored values can be priced by the server, so
    // free-form TEXT / FILE options are left out of the manual order
    const loadProductOptions = async (productId) => {
        if (!productId || optionsByProduct[productId]) return;

        try {
            const res = await getProductOptions(productId);
            const list = extractList(res?.data, ["options", "option"]);
            const withValues = await Promise.all(
                list.map(async (option) => {
                    const valRes = await getOptionValues(option._id);
                    return {
                        ...option,
                        values: extractList(valRes?.data, ["values", "value"])
                    };
                })
            );

            setOptionsByProduct((prev) => ({
                ...prev,
                [productId]: withValues.filter((option) => option.values.length > 0)
            }));
        } catch {
            setOptionsByProduct((prev) => ({ ...prev, [productId]: [] }));
        }
    };

    const selectProduct = (index, productId) => {
        setItems((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, productId, selections: {} } : item
            )
        );
        loadProductOptions(productId);
    };

    const selectOption = (index, optionId, valueId) => {
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, selections: { ...item.selections, [optionId]: valueId } }
                    : item
            )
        );
    };

    const optionsFor = (item) => optionsByProduct[item.productId] || [];

    // The chosen { option, value } pairs, in the product's option order
    const chosenOptions = (item) =>
        optionsFor(item)
            .map((option) => ({
                option,
                value: option.values.find((v) => v._id === item.selections?.[option._id])
            }))
            .filter((pair) => pair.value);

    const addLine = () => {
        setItems((prev) => [...prev, { productId: "", qty: 1, selections: {} }]);
    };

    const removeLine = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const getLinePrice = (item) => {
        const product = products.find((p) => p._id === item.productId);

        if (!product) return null;

        // Same rule as the server: add each value's delta, then apply its multiplier
        return chosenOptions(item).reduce(
            (price, { value }) =>
                (price + (Number(value.priceDelta) || 0)) *
                (Number(value.priceMultiplier) || 1),
            Number(product.basePrice) || 0
        );
    };

    const estimatedSubtotal = items.reduce(
        (sum, item) => sum + (getLinePrice(item) || 0) * (Number(item.qty) || 0),
        0
    );

    const handleCreateCustomer = async (event) => {
        event.preventDefault();
        setCustomerError("");

        if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) {
            setCustomerError("Name, phone and email are required");
            return;
        }

        setIsCreatingCustomer(true);

        try {
            const res = await createUser(newCustomer);
            const user = res?.data?.user;

            await loadOptions();

            if (user?._id) {
                setCustomerId(user._id);
            }

            setIsNewCustomerOpen(false);
            setNewCustomer({ name: "", phone: "", email: "" });
        } catch (err) {
            setCustomerError(err.message || "Failed to create customer");
        } finally {
            setIsCreatingCustomer(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const validItems = items.filter((item) => item.productId && item.qty > 0);

        if (!customerId) {
            setError("Select a customer");
            return;
        }

        if (validItems.length === 0) {
            setError("Add at least one item");
            return;
        }

        for (const item of validItems) {
            const missing = optionsFor(item).filter(
                (option) => option.isRequired && !item.selections?.[option._id]
            );

            if (missing.length > 0) {
                const product = products.find((p) => p._id === item.productId);
                setError(
                    `Choose ${missing.map((o) => o.name).join(", ")} for ${product?.name || "this product"}`
                );
                return;
            }
        }

        setIsSubmitting(true);

        try {
            await createManualOrder({
                userId: customerId,
                paymentMethod: paymentMethod.toUpperCase(),
                items: validItems.map((item) => ({
                    product: item.productId,
                    qty: Number(item.qty),
                    selectedOptions: chosenOptions(item).map(({ option, value }) => ({
                        name: option.name,
                        value: value.value
                    }))
                }))
            });

            router.push("/dashboard/orders");
        } catch (err) {
            setError(err.message || "Failed to create order");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
                <FormField label="Customer">
                    <select
                        className={inputClass}
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                    >
                        <option value="">Select...</option>
                        {customers.map((customer) => (
                            <option key={customer._id} value={customer._id}>
                                {customer.name} · {customer.phone}
                            </option>
                        ))}
                    </select>
                </FormField>

                <button
                    type="button"
                    onClick={() => setIsNewCustomerOpen(true)}
                    className="text-sm font-semibold text-accent hover:text-accent-dark"
                >
                    + New customer
                </button>

                <FormField label="Payment method">
                    <select
                        className={inputClass}
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                        {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>
                                {method}
                            </option>
                        ))}
                    </select>
                </FormField>

                <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                        Items
                    </p>

                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={index} className="space-y-2 rounded-xl border border-border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    className={`${inputClass} min-w-0 flex-1`}
                                    value={item.productId}
                                    onChange={(e) => selectProduct(index, e.target.value)}
                                >
                                    <option value="">Select product...</option>
                                    {products.map((product) => (
                                        <option key={product._id} value={product._id}>
                                            {product.name} ({product.sku}) ·{" "}
                                            {formatCurrency(product.basePrice)}
                                        </option>
                                    ))}
                                </select>

                                {getLinePrice(item) !== null && (
                                    <span className="text-sm text-text-muted">
                                        {formatCurrency(getLinePrice(item))} × {item.qty || 0} ={" "}
                                        <span className="font-semibold text-text">
                                            {formatCurrency(
                                                getLinePrice(item) * (Number(item.qty) || 0)
                                            )}
                                        </span>
                                    </span>
                                )}

                                <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) =>
                                        updateItem(index, "qty", e.target.value)
                                    }
                                    className={`${inputClass} w-20`}
                                />

                                <button
                                    type="button"
                                    onClick={() => removeLine(index)}
                                    className="rounded-lg border border-border p-2 text-text-muted hover:text-red-500"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {optionsFor(item).length > 0 && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {optionsFor(item).map((option) => (
                                        <label key={option._id} className="text-xs font-semibold text-text-muted">
                                            {option.name}
                                            {option.isRequired && <span className="text-red-500"> *</span>}
                                            <select
                                                className={`${inputClass} mt-1`}
                                                value={item.selections?.[option._id] || ""}
                                                onChange={(e) =>
                                                    selectOption(index, option._id, e.target.value)
                                                }
                                            >
                                                <option value="">
                                                    {option.isRequired ? "Choose..." : "None"}
                                                </option>
                                                {option.values.map((value) => (
                                                    <option key={value._id} value={value._id}>
                                                        {value.value}
                                                        {Number(value.priceDelta)
                                                            ? ` (+${formatCurrency(value.priceDelta)})`
                                                            : ""}
                                                        {Number(value.priceMultiplier) &&
                                                        Number(value.priceMultiplier) !== 1
                                                            ? ` (×${value.priceMultiplier})`
                                                            : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ))}
                                </div>
                            )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addLine}
                        className="mt-2 text-sm font-semibold text-accent hover:text-accent-dark"
                    >
                        + Add line
                    </button>

                    {estimatedSubtotal > 0 && (
                        <p className="mt-3 text-sm font-semibold">
                            Subtotal (before tax): {formatCurrency(estimatedSubtotal)}
                        </p>
                    )}
                </div>

                {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
                >
                    {isSubmitting ? "Creating..." : "Create order"}
                </button>
            </form>

            {isNewCustomerOpen && (
                <Modal title="New customer" onClose={() => setIsNewCustomerOpen(false)}>
                    <form onSubmit={handleCreateCustomer} className="space-y-4">
                        <FormField label="Name">
                            <input
                                className={inputClass}
                                value={newCustomer.name}
                                onChange={(e) =>
                                    setNewCustomer((prev) => ({
                                        ...prev,
                                        name: e.target.value
                                    }))
                                }
                            />
                        </FormField>

                        <FormField label="Phone">
                            <input
                                className={inputClass}
                                value={newCustomer.phone}
                                onChange={(e) =>
                                    setNewCustomer((prev) => ({
                                        ...prev,
                                        phone: e.target.value
                                    }))
                                }
                            />
                        </FormField>

                        <FormField label="Email">
                            <input
                                type="email"
                                className={inputClass}
                                value={newCustomer.email}
                                onChange={(e) =>
                                    setNewCustomer((prev) => ({
                                        ...prev,
                                        email: e.target.value
                                    }))
                                }
                            />
                        </FormField>

                        {customerError && (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                                {customerError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isCreatingCustomer}
                            className="w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
                        >
                            {isCreatingCustomer ? "Creating..." : "Create customer"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
