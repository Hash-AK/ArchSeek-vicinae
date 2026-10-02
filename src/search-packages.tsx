// various import
import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	List,
	showToast,
	Toast,
	Color,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
interface PackageDescription{
    pkgname: string
    pkgbase: string
    repo: string
    arch: string
    pkgver: string
    pkgrel: string
    epoch: number
    pkgdesc: string
    url: string
    filename: string
    compressed_size: number
    installed_size: number
    build_date: string //for now, going to try to parse this later (TODO)
    last_update: string // same as for build_date (TODO)
    flag_date: null | string //in case it was flagged
    maintainers: string[]
    packager: string
    groups: string[]
    licenses: string[]
    conflicts: string[]
    provides: string[]
    replaces: string[]
    depends: string[]
    optdepends: string[]
    makedepends: string[]
    checkdepends: string[]
}
interface PackageSearchResult {
    version: number
    limit: number
    valid: boolean
    results: PackageDescription[]
    num_pages: number
    count: number
    page: number
}
interface AURPackageDescription{
    Description: string
    FirstSubmitted: EpochTimeStamp
    ID: number
    LastModified: EpochTimeStamp
    Maintainer: string
    Name: string
    NumVotes: number
    OutOfDate: null | EpochTimeStamp
    PackageBase: string
    PackageBaseID: number
    Popularity: number
    URL: string
    URLPath: string
    Version: string

}
interface AURSearchResult {
    resultcount: number
    results: AURPackageDescription[]
    type: string
    version: number
}
interface SearchState {
    officialResults: PackageDescription[]
    AURResults: AURPackageDescription[]
}

function useSearchPackage(searchTerm: string, source: string){
    const defaultOutput = {officialResults: [],AURResults: []} as SearchState
    const [packageSearch, setPackageSearch] = useState<SearchState>(defaultOutput)
        useEffect(() => {
        if(searchTerm.length==0){
            setPackageSearch(defaultOutput)
            return
        }
        const timeout = setTimeout(()=>{
        if(source == "All"){

        }
        else if (source == "AUR"){
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://aur.archlinux.org/rpc/v5/search/${urlEncodedSearchTerm}`).then((response)=> {
                if (!response.ok){
                    showToast({ title: "Failed to fetch the search results",message: String(response.status),style: Toast.Style.Failure})
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data)=> {
                let typedData = data as AURSearchResult
                console.dir(typedData, {depth: null})
                setPackageSearch({officialResults:[], AURResults: typedData.results})
            })
        }
        else if (source == "Official"){
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://archlinux.org/packages/search/json/?q=${urlEncodedSearchTerm}`).then((response)=>{
                if (!response.ok){
                    showToast({ title: "Failed to fetch the search results",message: String(response.status),style: Toast.Style.Failure})
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data) => {
                let typedData = data as PackageSearchResult
                console.dir(typedData, {depth: null})
                setPackageSearch({officialResults: typedData.results,AURResults:[]})
            })
        } 

        },200)
        return() => clearTimeout(timeout)
    },[searchTerm])


    return packageSearch
}

export default function ArchSeek(){
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    let selectedPackage
    let testText = useSearchPackage(query, "AUR")
    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
            {query === "" ?(
                <List.EmptyView title="No Package Found" description="Try to search something else." icon={{source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}}/>
            ) : (
                <>
                {testText.officialResults.map((officialPackage,index) =>
                <List.Item id={String(index)} title={officialPackage.pkgname} key={`${officialPackage.pkgname}-${officialPackage.repo}-${officialPackage.arch}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${officialPackage.pkgname}\n${officialPackage.pkgdesc}`}/>
                } accessories={[
                    { tag: { value: "Arch Repos", color: Color.Blue}}
                ]} actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy upsteam url to clipboard" content={officialPackage.url} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon={Icon.CopyClipboard}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon="Arch_Linux_logo.svg"/>
                    </ActionPanel>
                }/>

                )}
                {testText.AURResults.map((AURPackage,index) => 
                <List.Item id={String(index)} title={AURPackage.Name} key={`${AURPackage.ID}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${AURPackage.Name}\n${AURPackage.Description}`}/>
                } accessories={[
                    { tag: { value: "AUR", color: Color.Green}}
                ]}/>
                
            )}
            

                 </>   
            )
            
            }
        </List>
    );
}