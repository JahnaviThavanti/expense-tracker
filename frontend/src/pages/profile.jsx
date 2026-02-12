import { useEffect, useState } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-profile.css";

export default function Profile() {

  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    monthlyBudget: "",
    phone: "",
    age: "",
    gender: "",
    occupation: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await API.get("/user/me");
      setUser(res.data);

      setForm({
        name: res.data.name || "",
        monthlyBudget: res.data.monthlyBudget || "",
        phone: res.data.phone || "",
        age: res.data.age || "",
        gender: res.data.gender || "",
        occupation: res.data.occupation || ""
      });

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  /* SAVE PROFILE */
  const saveProfile = async () => {
    try {
      const res = await API.put("/user/update", form);
      setUser(res.data);
      setEditing(false);
    } catch {
      alert("Update failed");
    }
  };

  /* IMAGE UPLOAD */
  const uploadImage = async (e) => {
    if (!e.target.files[0]) return;

    const formData = new FormData();
    formData.append("profile", e.target.files[0]);

    try {
      const res = await API.post("/user/upload-image", formData);
      setUser(res.data);
    } catch {
      alert("Image upload failed");
    }
  };

  if (loading) return <h2 style={{ padding: 40 }}>Loading profile...</h2>;

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <div className="profile-page">

          {/* PROFILE HERO */}
          <div className="profile-hero">

            <div className="profile-avatar">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="profile" />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <label className="photo-btn">
              Change Photo
              <input type="file" onChange={uploadImage} hidden />
            </label>

            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
          </div>

          {/* PROFILE BODY */}
          {!editing ? (
            <div className="profile-body">

              <div className="profile-grid">

                <div className="info-card">
                  <span>Monthly Budget</span>
                  <strong>$ {user?.monthlyBudget || "-"}</strong>
                </div>

                <div className="info-card">
                  <span>Phone</span>
                  <strong>{user?.phone || "-"}</strong>
                </div>

                <div className="info-card">
                  <span>Age</span>
                  <strong>{user?.age || "-"}</strong>
                </div>

                <div className="info-card">
                  <span>Gender</span>
                  <strong>{user?.gender || "-"}</strong>
                </div>

                <div className="info-card">
                  <span>Occupation</span>
                  <strong>{user?.occupation || "-"}</strong>
                </div>

              </div>

              <button className="primary-btn" onClick={() => setEditing(true)}>
                Edit Profile
              </button>

            </div>
          ) : (

            /* EDIT MODE */
            <div className="profile-edit">

              <div className="edit-grid">

                <input
                  placeholder="Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />

                <input
                  placeholder="Monthly Budget"
                  value={form.monthlyBudget}
                  onChange={e => setForm({ ...form, monthlyBudget: e.target.value })}
                />

                <input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />

                <input
                  placeholder="Age"
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                />

                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>

                <input
                  placeholder="Occupation"
                  value={form.occupation}
                  onChange={e => setForm({ ...form, occupation: e.target.value })}
                />

              </div>

              <div className="edit-actions">
                <button className="primary-btn" onClick={saveProfile}>
                  Save Changes
                </button>

                <button className="secondary-btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
