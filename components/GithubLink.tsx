import Image from 'next/image';
import GithubLogo from '../public/assets/github.svg';
export function GithubLink() {
  const handleClick = () => {
    window?.open('https://github.com/', '_blank')?.focus();
  };
  return (
    <div className="mx-1">
      <button className="flex items-center" onClick={handleClick}>
        <Image src={GithubLogo} className="w-5 h-5" alt="github logo" />
        <div className="xxs:hidden md:block ml-2">VOICE FLOW</div>
      </button>
    </div>
  );
}
