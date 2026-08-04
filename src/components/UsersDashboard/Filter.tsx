const Filter = ({ label, options }: { label: string; options: string[] }) => {
  return (
    <select className="border p-2 rounded-3xl">
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default Filter;
