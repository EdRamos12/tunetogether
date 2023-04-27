import styles from "../styles/TextInput.module.css";

interface TextInputProps {
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined;
  value: string | number | boolean | undefined;
  id: string;
  required: boolean;
  label: string;
  customStylesWrapper?: {
    readonly [key: string]: string;
  }
  type?: React.HTMLInputTypeAttribute;
  minLength?: number
}

const TextInput = (props: TextInputProps) => {
  return (
    <div className={styles.inputContainer}>
      <label htmlFor={props.id} id={`${props.id}_id`} className={Boolean(props.value) ? styles.active : ''}>{props.label}</label>
      <input minLength={props.minLength || 0} id={props.id} name={props.id} className={styles.loginInput} type={props.type || "text"} onChange={ props.onChange } required={props.required} />
    </div>
  );
}

export default TextInput;