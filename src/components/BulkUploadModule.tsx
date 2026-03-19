import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../services/api';

const TEMPLATES = {
  students: {
    label: 'Students',
    headers: ['indexNumber', 'name', 'email', 'programId', 'level', 'gender', 'dateOfBirth', 'phoneNumber', 'address', 'status'],
    uploadFn: api.bulkUploadStudents
  },
  programs: {
    label: 'Programs',
    headers: ['name', 'code', 'department', 'duration', 'description'],
    uploadFn: api.bulkUploadPrograms
  },
  courses: {
    label: 'Courses',
    headers: ['name', 'code', 'creditHours', 'programId', 'semester', 'level'],
    uploadFn: api.bulkUploadCourses
  },
  lecturers: {
    label: 'Lecturers',
    headers: ['name', 'email', 'department', 'phoneNumber'],
    uploadFn: api.bulkUploadLecturers
  },
  users: {
    label: 'Users',
    headers: ['name', 'email', 'role', 'avatar'],
    uploadFn: api.bulkUploadUsers
  }
};

export const BulkUploadModule: React.FC = () => {
  const [selectedType, setSelectedType] = useState<keyof typeof TEMPLATES>('students');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = TEMPLATES[selectedType];
    const csv = Papa.unparse([template.headers]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedType}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const template = TEMPLATES[selectedType];
          const response = await template.uploadFn(results.data);
          setResult({
            success: true,
            message: `Successfully uploaded ${response.count} ${selectedType}.`
          });
          setFile(null);
        } catch (error: any) {
          setResult({
            success: false,
            message: error.message || 'Failed to upload data. Please check your template and try again.'
          });
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        setResult({
          success: false,
          message: `CSV Parsing Error: ${error.message}`
        });
        setUploading(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg">Bulk Data Upload</h2>
          <p className="text-slate-500 text-sm">Upload multiple records at once using CSV templates.</p>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="label">Select Data Type</label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setFile(null);
                      setResult(null);
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      selectedType === type 
                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                        : 'border-slate-100 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet size={20} className={selectedType === type ? 'text-blue-600' : 'text-slate-400'} />
                      <span className="font-medium">{TEMPLATES[type].label}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedType(type);
                        downloadTemplate();
                      }}
                      className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                      title="Download Template"
                    >
                      <Download size={18} />
                    </button>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                  <Upload size={32} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900">Upload CSV File</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6 max-w-xs">
                  Make sure your file matches the {TEMPLATES[selectedType].label} template.
                </p>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="btn btn-secondary cursor-pointer"
                >
                  {file ? 'Change File' : 'Select CSV File'}
                </label>
                
                {file && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-3">
                    <FileSpreadsheet size={18} className="text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full btn btn-primary gap-2 py-3"
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                {uploading ? 'Uploading...' : `Upload ${TEMPLATES[selectedType].label}`}
              </button>

              {result && (
                <div className={`p-4 rounded-xl flex gap-3 ${
                  result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {result.success ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                  <p className="text-sm font-medium">{result.message}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              Important Instructions
            </h4>
            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
              <li>Download the template for the specific data type you want to upload.</li>
              <li>Do not change the column headers in the CSV file.</li>
              <li>Ensure all required fields are filled correctly.</li>
              <li>For <strong>Students</strong>, the <code>programId</code> must match an existing program ID.</li>
              <li>For <strong>Courses</strong>, the <code>programId</code> must match an existing program ID.</li>
              <li>The system will automatically generate unique IDs for new records.</li>
              <li>Existing records with the same unique identifiers (like Index Number or Course Code) will be updated.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
