import { useState, useEffect } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-categories.css";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // Fetch categories on load
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await API.get("/categories");
      setCategories(response.data);
    } catch (err) {
      alert("Failed to load categories");
    }
  };

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategory.trim()) {
      alert("Please enter a category name");
      return;
    }

    setLoading(true);
    try {
      const response = await API.post("/categories", {
        name: newCategory
      });
      
      setCategories([...categories, response.data].sort((a, b) => 
        a.name.localeCompare(b.name)
      ));
      setNewCategory("");
      alert("Category added successfully! ✅");
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      await API.delete(`/categories/${id}`);
      setCategories(categories.filter(cat => cat._id !== id));
      alert("Category deleted successfully! ✅");
    } catch (err) {
      alert("Failed to delete category");
    }
  };

  // Start editing
  const handleStartEdit = (id, name) => {
    setEditingId(id);
    setEditName(name);
  };

  // Update category
  const handleUpdateCategory = async (id) => {
    if (!editName.trim()) {
      alert("Please enter a category name");
      return;
    }

    try {
      const response = await API.put(`/categories/${id}`, {
        name: editName
      });

      setCategories(
        categories.map(cat => cat._id === id ? response.data : cat)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditName("");
      alert("Category updated successfully! ✅");
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to update category");
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <div className="categories-page">
          {/* Header */}
          <div className="categories-header">
            <h1>Manage Categories</h1>
            <p>Create and organize your expense categories 📂</p>
          </div>

          {/* Add Category Form */}
          <form className="add-category-card" onSubmit={handleAddCategory}>
            <h2>Add New Category</h2>
            <div className="add-category-input-group">
              <input
                type="text"
                placeholder="Enter category name (e.g., Groceries, Entertainment, Rent)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="category-input"
              />
              <button 
                type="submit" 
                className="add-category-btn"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Category"}
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="categories-list-card">
            <h2>Your Categories ({categories.length})</h2>
            
            {categories.length === 0 ? (
              <div className="empty-state">
                <p>No categories yet. Create your first one! 🚀</p>
              </div>
            ) : (
              <div className="categories-grid">
                {categories.map((category) => (
                  <div key={category._id} className="category-item">
                    {editingId === category._id ? (
                      <div className="category-edit-mode">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="category-edit-input"
                          autoFocus
                        />
                        <div className="edit-buttons">
                          <button
                            onClick={() => handleUpdateCategory(category._id)}
                            className="edit-save-btn"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="edit-cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="category-name">{category.name}</span>
                        <div className="category-actions">
                          <button
                            onClick={() => handleStartEdit(category._id, category.name)}
                            className="edit-btn"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category._id)}
                            className="delete-btn"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
