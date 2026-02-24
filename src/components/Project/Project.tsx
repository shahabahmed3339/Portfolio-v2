import { Container } from "./styles";
import ScrollAnimation from "react-animate-on-scroll";

interface ProjectProps {
  projects: any;
}

export function Project({ projects }: ProjectProps) {
  return (
    <Container id="project">
      <h2>My Projects</h2>
      <div className="projects">
        {projects.map((project: any) => (
          <ScrollAnimation key={project.title} animateIn="flipInX">
            <div className="project">
              <header>
                <svg width="50" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="none" stroke="#23ce6b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <title>Folder</title>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <div className="project-links">
                  <a href={project.github} target="_blank" rel="noreferrer">
                    <img src="/assets/github.svg" alt="GitHub" />
                  </a>
                  {/* <a href="" target="_blank" rel="noreferrer">
                    <img src="/assets/external-link.svg" alt="Visit site" />
                  </a> */}
                </div>
              </header>
              <div className="body">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
              </div>
              <footer>
                <ul className="tech-list">
                  {project.techList?.map((tech: any) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </footer>
            </div>
          </ScrollAnimation>
        ))}
      </div>
    </Container>
  );
}