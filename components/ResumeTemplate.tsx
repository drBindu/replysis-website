import React from 'react';

export default function ResumeTemplate({ data }: { data: any }) {
  if (!data || !data.personalInfo) {
    return <div className="p-10 bg-white shadow-2xl w-[800px] h-[1050px] flex items-center justify-center text-gray-400">Loading tailored resume...</div>;
  }

  return (
    <div className="p-10 bg-white text-black shadow-2xl font-serif w-[800px] min-h-[1050px] mx-auto border border-gray-200 text-[11px] leading-tight">
      {/* HEADER */}
      <div className="text-center border-b-2 border-black pb-2 mb-4">
        <h1 className="text-2xl font-bold uppercase">{data.personalInfo.name}</h1>
        <p className="font-bold text-gray-700">{data.personalInfo.headline}</p>
        <p>{data.personalInfo.location} | {data.personalInfo.phone} | {data.personalInfo.email}</p>
      </div>

      {/* SUMMARY */}
      <section className="mb-4">
        <h2 className="font-bold border-b border-black uppercase mb-1">Summary</h2>
        <p className="text-justify">{data.summary}</p>
      </section>

      {/* SKILLS - New Section */}
      <section className="mb-4">
        <h2 className="font-bold border-b border-black uppercase mb-1">Skills</h2>
        {data.skillCategories?.map((cat: any, i: number) => (
          <p key={i} className="mb-0.5">
            <span className="font-bold">{cat.name}:</span> {cat.skills}
          </p>
        ))}
      </section>

      {/* EXPERIENCE */}
      <section className="mb-4">
        <h2 className="font-bold border-b border-black uppercase mb-1">Experience</h2>
        {data.experience?.map((exp: any, i: number) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between font-bold">
              <span>{exp.company}  -  {exp.role}</span>
              <span>{exp.period}</span>
            </div>
            <p className="italic text-gray-600 mb-1">{exp.location}</p>
            <ul className="list-disc ml-4">
              {Array.isArray(exp.bullets) ? exp.bullets.map((b: string, j: number) => <li key={j}>{b}</li>) : <li>{exp.bullets}</li>}
            </ul>
          </div>
        ))}
      </section>

      {/* PROJECTS */}
      <section className="mb-4">
        <h2 className="font-bold border-b border-black uppercase mb-1">Projects</h2>
        {data.projects?.map((proj: any, i: number) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between font-bold">
              <span>{proj.title}</span>
              <span className="font-normal italic">{proj.tech}</span>
            </div>
            <ul className="list-disc ml-4">
              {Array.isArray(proj.bullets) ? proj.bullets.map((b: string, j: number) => <li key={j}>{b}</li>) : <li>{proj.bullets}</li>}
            </ul>
          </div>
        ))}
      </section>

      {/* EDUCATION */}
      <section>
        <h2 className="font-bold border-b border-black uppercase mb-1">Education</h2>
        {data.education?.map((edu: any, i: number) => (
          <div key={i} className="flex justify-between">
            <span><span className="font-bold">{edu.school}</span>, {edu.degree}</span>
            <span>{edu.period}</span>
          </div>
        ))}
      </section>
    </div>
  );
}