import type { ProfileLink } from '../../content/lizzardKevinProfile.ts';
import type { SupportedLanguage } from '../../i18n/resolveInitialLanguage.ts';
import { ProfileSocialLinks } from './ProfileSocialLinks.tsx';

export function ContactIcon({kind}:{kind:'mail'|'phone'|'pin'|'code'}){
  return <svg className="profile-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='mail'?<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>:null}
    {kind==='pin'?<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>:null}
    {kind==='phone'?<path d="m8 3 2 5-3 2c1.5 3 3 4.5 6 6l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 6c0-1 1-3 2-3Z"/>:null}
    {kind==='code'?<><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/></>:null}
  </svg>;
}

export function ProfileContactPanel({links,language}:{links:readonly ProfileLink[];language:SupportedLanguage}){
  const email=links.find(link=>link.href?.startsWith('mailto:'));
  const phone=links.find(link=>link.href?.startsWith('tel:'));
  const base=links.find(link=>!link.href);
  const github=links.find(link=>link.href?.includes('github.com/'));
  return <div className="profile-contact-panel">
    {email?<a className="profile-contact-panel__email" href={email.href} aria-label={`${email.label}: ${email.value}`}>
      <ContactIcon kind="mail"/><span>{email.value}</span><span className="profile-contact-panel__arrow" aria-hidden="true">↗</span>
    </a>:null}
    <div className="profile-contact-panel__meta">
      {base?<span title={base.label}><ContactIcon kind="pin"/><span>{base.label} · {base.value}</span></span>:null}
      {phone?<a href={phone.href} aria-label={`${phone.label}: ${phone.value}`}><ContactIcon kind="phone"/><span>{phone.value}</span></a>:null}
    </div>
    <div className="profile-contact-panel__networks">
      {github?<a className="profile-contact-panel__github" href={github.href} target="_blank" rel="noopener noreferrer" aria-label={`GitHub · ${github.value}`}>
        <ContactIcon kind="code"/><span>GitHub</span><span aria-hidden="true">↗</span>
      </a>:null}
      <ProfileSocialLinks account="personal" language={language}/>
    </div>
  </div>;
}
