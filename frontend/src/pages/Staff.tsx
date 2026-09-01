import React, { useEffect, useState } from 'react';
import { usersApi } from '../api/services';
import { User } from '../types';
import { UserPlus, UserCheck, Shield, Check, Loader2, Mail, Phone, Lock, User as UserIcon } from 'lucide-react';

export const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getStaff();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const newStaff = await usersApi.createStaff({
        full_name: fullName,
        email,
        phone,
        password,
      });
      setSuccessMsg(`Staff account for ${newStaff.full_name} created successfully!`);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setStaffList((prev) => [newStaff, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create staff user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Staff Account Management</h2>
        <p className="text-sm text-slate-400 mt-1">Create staff credentials for bar entrance scanners</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Register Staff Form */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">Register Staff</h3>
              <p className="text-xs text-slate-400">Grants scanner check-in permissions</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sarah Connor"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@bar.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Initial Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-slate-100 font-bold rounded-xl shadow-lg shadow-indigo-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Create Staff User</span>
            </button>
          </form>
        </div>

        {/* Staff User List */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-4">Staff Members ({staffList.length})</h3>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span>Fetching staff directory...</span>
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
              No staff members registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0d1117] text-slate-400 text-xs font-mono uppercase tracking-wider border-b border-[#21262d]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-[#21262d]/50">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{s.id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{s.full_name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{s.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          <Shield className="w-3 h-3" /> {s.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
