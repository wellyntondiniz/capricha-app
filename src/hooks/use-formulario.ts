import { useState } from 'react';

type Validador<C extends string> = (campo: C, valores: Record<C, string>) => string | undefined;

// Controla valores e mensagens de erro de um formulário, no mesmo padrão em todas as telas:
// - a mensagem aparece quando o usuário sai do campo (ou ao enviar);
// - depois disso, é atualizada a cada digitação e some assim que o valor fica válido;
// - `dependentes` revalida outros campos (ex.: a confirmação quando a senha muda).
export function useFormulario<C extends string>(
  iniciais: Record<C, string>,
  validar: Validador<C>,
  dependentes: Partial<Record<C, C[]>> = {},
) {
  const [valores, setValores] = useState<Record<C, string>>(iniciais);
  const [erros, setErros] = useState<Partial<Record<C, string>>>({});
  const [tocados, setTocados] = useState<Partial<Record<C, boolean>>>({});

  function alterar(campo: C, valor: string) {
    const novosValores = { ...valores, [campo]: valor };
    setValores(novosValores);

    const revalidar = [campo, ...(dependentes[campo] ?? [])].filter((c) => tocados[c]);
    if (revalidar.length > 0) {
      setErros((atuais) => {
        const novos = { ...atuais };
        for (const c of revalidar) novos[c] = validar(c, novosValores);
        return novos;
      });
    }
  }

  function sair(campo: C) {
    setTocados((atuais) => ({ ...atuais, [campo]: true }));
    setErros((atuais) => ({ ...atuais, [campo]: validar(campo, valores) }));
  }

  // Valida os campos informados (ou todos) e retorna true se estiverem válidos.
  function validarCampos(campos: C[] = Object.keys(valores) as C[]): boolean {
    const novosErros: Partial<Record<C, string>> = {};
    const novosTocados: Partial<Record<C, boolean>> = {};
    for (const campo of campos) {
      novosErros[campo] = validar(campo, valores);
      novosTocados[campo] = true;
    }
    setErros((atuais) => ({ ...atuais, ...novosErros }));
    setTocados((atuais) => ({ ...atuais, ...novosTocados }));
    return campos.every((campo) => !novosErros[campo]);
  }

  // Mensagens vindas da API para campos específicos. Ignora campos que não existem no formulário.
  function definirErros(errosCampos: Record<string, string>): boolean {
    const conhecidos = Object.entries(errosCampos).filter(([campo]) => campo in valores);
    if (conhecidos.length === 0) return false;
    setErros((atuais) => ({ ...atuais, ...Object.fromEntries(conhecidos) }));
    setTocados((atuais) => ({ ...atuais, ...Object.fromEntries(conhecidos.map(([c]) => [c, true])) }));
    return true;
  }

  function limpar() {
    setValores(iniciais);
    setErros({});
    setTocados({});
  }

  return { valores, erros, alterar, sair, validarCampos, definirErros, limpar };
}
