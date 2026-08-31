import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Shield,
  Building,
  Calendar,
  BookOpen,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Student } from '../../types';
import { api } from '../../services/api';

export const StudentProfileView: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getStudentProfile().then((res) => {
      if (res.success) {
        setStudent(res.student);
      }
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold mt-3">Loading student record...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <p className="text-sm font-bold text-slate-700">Student profile could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white text-indigo-900 font-black text-3xl flex items-center justify-center shadow-xl shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/40 text-indigo-100 border border-indigo-400/30">
              {student.admissionQuota} Quota
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              {student.status}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h1>
          <p className="text-xs text-indigo-200 mt-0.5">{student.course}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-indigo-100 font-mono">
            <span>Roll: <strong className="text-amber-300 font-bold">{student.rollNumber}</strong></span>
            <span>•</span>
            <span>Reg: <strong>{student.registrationNo}</strong></span>
          </div>
        </div>
      </div>

      {/* Profile Details Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Academic Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Academic Information</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Department / Branch</span>
              <p className="font-bold text-slate-800 text-sm">{student.department}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-medium block">Current Semester</span>
                <p className="font-bold text-slate-800">Semester {student.semester}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Academic Batch</span>
                <p className="font-bold text-slate-800">{student.academicYear}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-medium block">Fee Scheme</span>
                <p className="font-bold text-indigo-700">{student.feeCategory}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Admission Category</span>
                <p className="font-bold text-slate-800">{student.admissionQuota}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Guardian Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Contact & Guardian Information</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Email Address</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{student.email}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Student Mobile</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{student.phone}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-400 font-medium block">Parent / Guardian</span>
                <p className="font-bold text-slate-800">{student.guardianName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Guardian Phone</span>
                <p className="font-semibold text-slate-800">{student.guardianPhone}</p>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Permanent Address</span>
              <p className="font-medium text-slate-700 flex items-start gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{student.address}</span>
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
