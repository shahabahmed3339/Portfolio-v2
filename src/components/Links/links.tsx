

interface LinksProps {
    links: any;
}

export function Links({ links }: LinksProps) {
    return (
        <div className="social-media">
            {links.map((link: any) => (
                <a key={link.title}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                >
                    <img src={link.icon} alt={link.title} />
                </a>
            ))}
        </div>
    )
}
