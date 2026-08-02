export const MASTER_RESUME = {
  personalInfo: {
    name: "Your Full Name",
    headline: "Software Engineer | Full Stack Developer | Cloud & DevOps",
    email: "your.email@example.com",
    phone: "+1 (555) 000-0000",
    location: "City, State",
    linkedin: "linkedin.com/in/yourprofile",
    github: "github.com/yourusername",
    portfolio: "yourportfolio.com",
    customLinks: [] as { label: string; url: string }[],
  },
  summary:
    "Results-driven Software Engineer with 4+ years of experience designing, developing, and deploying scalable web applications and distributed systems. Proficient in modern JavaScript/TypeScript frameworks, cloud-native architectures, and agile development practices. Passionate about writing clean, maintainable code and delivering impactful user experiences.",
  skillCategories: [
    { name: "Languages", skills: "Java, Python, JavaScript, TypeScript, SQL, C++" },
    { name: "Frameworks & Libraries", skills: "React, Next.js, Node.js, Spring Boot, Express, Tailwind CSS" },
    { name: "Cloud & DevOps", skills: "AWS, Docker, Kubernetes, CI/CD Pipelines, GitHub Actions, Terraform" },
    { name: "Databases & Tools", skills: "PostgreSQL, MongoDB, Redis, Git, Jira, Figma" },
  ],
  experience: [
    {
      company: "Company Name",
      role: "Full Stack Software Engineer",
      location: "City, State",
      period: "Jan 2023 - Present",
      bullets: [
        "Architected and developed a customer-facing dashboard serving 50K+ monthly active users using React, Next.js, and PostgreSQL.",
        "Designed RESTful APIs and microservices with Node.js and Spring Boot, reducing average response time by 40%.",
        "Led migration from monolithic architecture to containerized microservices on AWS ECS, improving deployment frequency by 3x.",
        "Collaborated with product and design teams to implement A/B testing frameworks that increased conversion rates by 18%.",
      ],
    },
    {
      company: "Previous Company",
      role: "Software Engineer",
      location: "City, State",
      period: "Jun 2020 - Dec 2022",
      bullets: [
        "Built and maintained high-traffic web applications using React and TypeScript, serving 100K+ daily requests.",
        "Optimized database queries and indexing strategies in PostgreSQL, reducing query execution time by 60%.",
        "Implemented automated testing pipelines with Jest and Cypress, achieving 95% code coverage across all services.",
        "Mentored 3 junior developers through code reviews, pair programming, and technical knowledge-sharing sessions.",
      ],
    },
  ],
  projects: [
    {
      title: "E-Commerce Platform",
      tech: "Next.js, Stripe, PostgreSQL, Redis, Docker",
      period: "2024",
      bullets: [
        "Built a full-stack e-commerce platform with real-time inventory management, secure payment processing via Stripe, and an admin dashboard.",
        "Implemented caching layer with Redis that reduced page load times by 55% and handled 10K+ concurrent sessions.",
      ],
    },
    {
      title: "Real-Time Chat Application",
      tech: "React, Socket.io, Node.js, MongoDB",
      period: "2023",
      bullets: [
        "Developed a real-time messaging app with WebSocket connections supporting 1,000+ simultaneous users.",
        "Integrated end-to-end encryption and file sharing with automatic media compression.",
      ],
    },
  ],
  education: [
    { school: "University Name", degree: "Master of Science - Computer Science", period: "Aug 2018 - May 2020", gpa: "3.9" },
    { school: "University Name", degree: "Bachelor of Science - Computer Science", period: "Aug 2014 - May 2018", gpa: "3.7" },
  ],
  certifications: [
    "AWS Certified Solutions Architect  -  Amazon Web Services (2024)",
    "Google Professional Cloud Developer  -  Google Cloud (2023)",
  ],
};