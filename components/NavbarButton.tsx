import { Icon } from "@primer/octicons-react"
import styles from '../styles/Navbar.module.css';

interface ButtonProps {
  buttonName: string;
  buttonCallback?: any;
  children?: any;
}

// {icon, buttonName, buttonCallback}
const NavbarButton = (props: ButtonProps) => {
  return (
    <>
      <div className={styles.buttonHolder}>
        <button onClick={props.buttonCallback} className={styles.sidebarButton}>
          {props.children}
        </button>
        <span>{props.buttonName}</span>
      </div>
    </>
  )
}

export default NavbarButton;