import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaLaptopCode } from 'react-icons/fa';

const Home = () => {
  const navigate = useNavigate();
  const [isStudent, setIsStudent] = useState(false);

  const handleGetStarted = () => {
    if (isStudent) {
      navigate('/job-listings');
    } else {
      navigate('/hr-login');
    }
  };

  const handleToggle = () => setIsStudent((prev) => !prev);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      {/* Toggle Switch */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div
          className="flex items-center gap-4 bg-white border border-[#264143] rounded-full px-6 py-2 shadow cursor-pointer"
          onClick={handleToggle} // ✅ Entire toggle area is clickable
        >
          <FaLaptopCode
            className={`text-2xl transition ${!isStudent ? 'text-[#264143]' : 'text-gray-400'}`}
            title="HR"
          />
          <div
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              isStudent ? 'bg-[#DE5499]' : 'bg-[#264143]'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                isStudent ? 'translate-x-6' : ''
              }`}
            />
          </div>
          <FaUserGraduate
            className={`text-2xl transition ${isStudent ? 'text-[#DE5499]' : 'text-gray-400'}`}
            title="Candidate"
          />
        </div>
      </div>

      <div className="bg-white border-2 border-[#264143] rounded-2xl shadow-[3px_4px_0px_1px_#E99F4C] p-10 max-w-xl w-full text-center mt-40">
        <h1 className="text-3xl font-extrabold text-[#264143] mb-2">Welcome to AI Resume Screener</h1>
        <p className="text-lg text-[#DE5499] mb-6 font-semibold">
          Streamline your resume submission and review process!
        </p>
        <p className="text-[#264143] mb-8">
          {isStudent
            ? "Submit your resume for instant analysis and guidance."
            : "HRs can manage, review, and process applications efficiently."}
        </p>

        <button
          onClick={handleGetStarted}
          className={`btn font-bold w-60 py-3 rounded-lg shadow hover:opacity-90 transition text-white ${
            isStudent ? 'bg-[#264143]' : 'bg-[#DE5499]'
          }`}
        >
          {isStudent ? 'See Job Listings' : 'HR Login'}
        </button>

        <div className="mt-10 text-xs text-gray-500">
          <span>Made for placements & recruitment</span>
        </div>
      </div>
    </div>
  );
};

export default Home;
