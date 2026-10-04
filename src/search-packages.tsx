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
    getPreferenceValues,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
import { DOMParser,XMLSerializer } from '@xmldom/xmldom'
interface Preferences {
    "aur-helper": string;
}
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
interface AURPackageMoreInfoResult{ //sob
resultcount: number
results: AURPackageMoreInfoDescription[]
type: string
version: number
}
interface AURPackageMoreInfoDescription{
    CoMaintainers: string[]
    Conflicts: string[]
    Depends: string[]
    Description: string
    FirstSubmitted: EpochTimeStamp
    ID: number
    Keywords: string[]
    LastModified: EpochTimeStamp
    License: string[]
    Maintainer: string
    MakeDepends: string[]
    Name: string
    NumVotes: number
    OutOfDate: null | EpochTimeStamp
    PackageBase: string
    PackageBaseID: number
    Popularity: number
    Provides: string[]
    Submitter: string
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
interface AURCommits{
    hash: string
    title: string
    date: string
    author: string
}
const defaultAurMoreInfoDescription = {CoMaintainers: [""],Conflicts: [""],Depends:[""],Description: "",FirstSubmitted:0,ID:0,Keywords:[""],LastModified:0,License:[""],Maintainer:"",MakeDepends:[""],Name:"",NumVotes:0,OutOfDate:null,PackageBase:"",PackageBaseID:0,Popularity:0,Provides:[""],Submitter:"",URL:"",URLPath:"",Version:""} as AURPackageMoreInfoDescription
const defaultOutput = {officialResults: [],AURResults: []} as SearchState
const prefs = getPreferenceValues<Preferences>();
function useGetMoreAURInfo(packageName: string|null){
    const [info,setInfo] = useState<AURPackageMoreInfoDescription>(defaultAurMoreInfoDescription)
    useEffect(() => {
    const controller = new AbortController();
    if (packageName == null){
        return () => controller.abort()
    }
    if (packageName.length == 0){
        return () => controller.abort()
    }

    (async() =>{
    const toast = await showToast({ title: "Fetching package info...", style: Toast.Style.Animated})
    let urlEncodedName = encodeURI(packageName)
    fetch(`https://aur.archlinux.org/rpc/v5/info?arg[]=${urlEncodedName}`,{signal: controller.signal}).then((response) =>{
        if(!response.ok){
            toast.title = "Failed to fetch package info"
            toast.message = String(response.status)
            toast.style = Toast.Style.Failure
            throw new Error(`Failed to fetch the page: ${response.status}`)
        }
        return response.json()
    }).then((data) =>{
        let typedData = data as AURPackageMoreInfoResult
        let results = typedData.results[0] as AURPackageMoreInfoDescription
        setInfo(results)
        toast.style = Toast.Style.Success
        toast.title = "Package info fetched!"
    }).catch((error)=>{
        if(controller.signal.aborted){
            return
        }
    })
    })()
    return () => {
        controller.abort()
    }
    },[packageName])
    return info
}
function useSearchPackage(searchTerm: string, source: string){
    const [packageSearch, setPackageSearch] = useState<SearchState>(defaultOutput)
        useEffect(() => {
        const controller = new AbortController();
        if(searchTerm.length==0){
            setPackageSearch(defaultOutput)
            return () => controller.abort()
        }

        const timeout = setTimeout(async ()=>{
        const toast = await showToast({ title: "Searching...", style: Toast.Style.Animated })
         /*   
        if(source == "All"){
            toast.hide()
            return
        }
        */
        if (source == "AUR"){
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://aur.archlinux.org/rpc/v5/search/${urlEncodedSearchTerm}`, {signal: controller.signal}).then((response)=> {
                if (!response.ok){
                    toast.title = "Failed to fetch the search results"
                    toast.message = String(response.status)
                    toast.style = Toast.Style.Failure
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data)=> {
                let typedData = data as AURSearchResult
                setPackageSearch({officialResults:[], AURResults: typedData.results})
                toast.style = Toast.Style.Success;
                toast.title = "Search complete";
            }).catch((error)=>{
                if(controller.signal.aborted){
                    return;
                }
                //Todo catch erro
            })
        }
        else if (source == "Official"){
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://archlinux.org/packages/search/json/?q=${urlEncodedSearchTerm}`, {signal: controller.signal}).then((response)=>{
                if (!response.ok){
                    toast.title = "Failed to fetch the search results"
                    toast.message = String(response.status)
                    toast.style = Toast.Style.Failure
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data) => {
                let typedData = data as PackageSearchResult
                setPackageSearch({officialResults: typedData.results,AURResults:[]})
                toast.style = Toast.Style.Success;
                toast.title = "Search complete";
            }).catch((error)=>{
                if(controller.signal.aborted){
                    return;
                }
                //Todo catch error
            })
        } 

        },400)
        return() => {
            clearTimeout(timeout)
            controller.abort()
        }

    },[searchTerm,source])


    return packageSearch
}
function useFetchPKGBUILD(packageName:string|null){
    const [pkgText, setPkgText] = useState<string>("")


    useEffect(()=>{
    const controller = new AbortController();
    if (packageName == null){
        return () => controller.abort()
    }
    if (packageName.length == 0){
        return () => controller.abort()
    }
        const encodedPackageName = encodeURI(packageName)
        fetch(`https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=${encodedPackageName}`,{signal:controller.signal}).then((response) =>{
            if (!response.ok){
                throw new Error(`Failed to fetch PKGBUILD: ${response.status}`)
            }
            return response.text()
        }).then((data) =>{
            setPkgText(data)
        }).catch((error) =>{
            if (controller.signal.aborted){
                return
            }
        })
        return () =>{
            controller.abort()
        }
    },[packageName])
    return pkgText
}
function useFetchPKGBUILDCommits(packageName:string|null){
    const [commits,setCommits] = useState<AURCommits[]>([])
    useEffect(() =>{
        const controller = new AbortController()
        if (packageName == null){
            return () => controller.abort()
            
        }
        if (packageName.length == 0){
            return () => controller.abort()
        }
        const encodedPackageName = encodeURI(packageName)
        fetch(`https://aur.archlinux.org/cgit/aur.git/atom/?h=${encodedPackageName}`,{signal:controller.signal}).then((response)=>{
            if (!response.ok){
                throw new Error(`Failed to fetch commits: ${response.status}`)
            }
            return response.text()
        }).then((data)=>{
            let aurCommits: AURCommits[] = []
            const xmlDoc = new DOMParser().parseFromString(data,"text/xml")
            let allEntrylements = xmlDoc.getElementsByTagName("entry")
            for (let i =0; i<allEntrylements.length;i++){  
                if (allEntrylements[i].hasChildNodes() === false){
                    return
                }
                const idContent = String(allEntrylements[i].getElementsByTagName("id")[0].textContent)
                const titleContent = String(allEntrylements[i].getElementsByTagName("title")[0].textContent)
                const dateContent = String(allEntrylements[i].getElementsByTagName("published")[0].textContent)
                const authorContent = String(allEntrylements[i].getElementsByTagName("author")[0].textContent)
                aurCommits.push({hash: idContent,title:titleContent,date: dateContent,author:authorContent})
                
            }
            setCommits(aurCommits)
        }).catch((error)=>{
            if(controller.signal.aborted){
                return
            }
            console.log(`Failed to fetch PKGBUILD commits: ${error}`)
        })
        return () =>{
            controller.abort()
        }
    },[packageName])
    return commits
    
}
function ReadPKGBUILD(PKGBUILD:string|null){

    return(
        <Detail markdown={`# PKGBUILD  \n\`\`\`  \n${PKGBUILD}  \n\`\`\`\``} actions={
            <ActionPanel>
            </ActionPanel>
        }/>
    )
}
function ReadPKGBUILDDiffs(PKGBUILDCommits:AURCommits[]){
    return(
        <Detail markdown={`# WIP`} actions={
            <ActionPanel>
                <ActionPanel.Submenu title="Select commit to compare" icon={Icon.Clock}>
                    {PKGBUILDCommits.map((elementObj,index) =>
                    <Action title={elementObj.title} icon={Icon.Git} onAction={() => console.log(elementObj.hash)} key={index}/>
                    )
                    }
                </ActionPanel.Submenu>
            </ActionPanel>
        }/>
    )
}
// formatBytes taken from https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes: number){
    if (!bytes)return "0 Bytes"
    const k = 1024
    const dm = 2
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
export default function ArchSeek(){
    const [query, setQuery] = useState("");
    const [sourceDropdown,setSourceDropdown] = useState("Official")
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Make sure to reset ID if results changes
    useEffect(() =>{
        setSelectedId(null)
    },[query,sourceDropdown])

    let selectedPackage: string| null = null
    let selectedPKGBase: string | null = null
    let selectedAUR: string| null =null
    let AURPackageInfo: AURPackageMoreInfoDescription = defaultAurMoreInfoDescription
    let PKGBUILD : string|null = null
    let PKGBUILDCommits: AURCommits[] = []

    let testText = useSearchPackage(query, sourceDropdown)
    if (selectedId != null){
        if (Number(selectedId) < testText.AURResults.length && sourceDropdown == "AUR" || Number(selectedId) < testText.officialResults.length && sourceDropdown == "Official"){
            if(sourceDropdown == "AUR"){
                selectedPackage = testText.AURResults[Number(selectedId)].Name
                selectedPKGBase = testText.AURResults[Number(selectedId)].PackageBase
                selectedAUR = selectedPackage
            } else if (sourceDropdown == "Official"){
                selectedPackage = testText.officialResults[Number(selectedId)].pkgname
            }
        } 
    } else {
        selectedPackage = ""
    }
    AURPackageInfo = useGetMoreAURInfo(selectedAUR)
    PKGBUILD = useFetchPKGBUILD(selectedPKGBase)
    PKGBUILDCommits = useFetchPKGBUILDCommits(selectedPKGBase)
    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)} searchBarAccessory={
        <List.Dropdown tooltip="Source" value={sourceDropdown} onChange={setSourceDropdown}>
            <List.Dropdown.Item title="AUR" value="AUR"/>
            <List.Dropdown.Item title="Official repos only" value="Official"/>
        </List.Dropdown>
    }>
            {query === "" ?(
                <List.EmptyView title="No Package Found" description="Try to search something else." icon={{source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}}/>
            ) : (
                <>
                {testText.officialResults.map((officialPackage,index) =>
                <List.Item id={String(index)} title={officialPackage.pkgname} key={`${officialPackage.pkgname}-${officialPackage.repo}-${officialPackage.arch}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${officialPackage.pkgname}  \n**Architecture:** ${officialPackage.arch}  \n**Repository:** ${officialPackage.repo}  \n**Description:** ${officialPackage.pkgdesc}  \n**Upstream URL:** ${officialPackage.url}  \n**License(s):** ${Array.isArray(officialPackage.licenses) && (officialPackage.licenses?.length) > 0 ? `${officialPackage.licenses.toString()}  \n` : ""}**Maintainers:** ${officialPackage.maintainers}  \n**Package Size:** ${formatBytes(officialPackage.compressed_size)}  \n**Installed Size:** ${formatBytes(officialPackage.installed_size)}  \n**Last Packager:** ${officialPackage.packager}  \n**Build Date:** ${new Date(officialPackage.build_date).toLocaleString()}  \n**Last Updated:** ${new Date(officialPackage.last_update).toLocaleString()}  \n${typeof officialPackage.flag_date === 'string' && officialPackage.flag_date?.length > 0 ? `<span style="color:red">_**Flagged out-of-date on:** ${new Date(officialPackage.flag_date).toLocaleDateString()}</span>_`:""}`}/>
                } accessories={[
                    { tag: {value: `${officialPackage.repo}`,color: Color.Yellow}},

                    { tag: {value: "Arch Repos",color: Color.SecondaryText}}
                ]} actions={
                    <ActionPanel>
                        <Action.RunInTerminal title="Install package" args={["/bin/bash","-c",`set -x;sudo pacman -S --needed ${officialPackage.pkgname}`]} options={{hold:true}}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon="Arch_Linux_logo.svg"/>
                        <Action.CopyToClipboard title="Copy upstream url to clipboard" content={officialPackage.url} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon={Icon.CopyClipboard}/>
                    </ActionPanel>
                }/>

                )}
                {testText.AURResults.map((AURPackage,index) => 
                <List.Item id={String(index)} title={AURPackage.Name} key={`${AURPackage.ID}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${AURPackage.Name}  \n**Package Base:** ${AURPackage.PackageBase}  \n**Description:** ${AURPackage.Description}  \n**Upstream URL:** ${AURPackage.URL}  \n${Array.isArray(AURPackageInfo?.Keywords) && (AURPackageInfo?.Keywords?.length) > 0 ?  `**Keywords:** ${AURPackageInfo.Keywords.toString()}  \n`: "" }${Array.isArray(AURPackageInfo?.License) && (AURPackageInfo?.License?.length) > 0 ? `**Licenses:** ${AURPackageInfo.License.toString()}  \n` : ""}${ Array.isArray(AURPackageInfo?.Conflicts) && (AURPackageInfo.Conflicts?.length) >0 ?`**Conflicts:** ${AURPackageInfo.Conflicts.toString()}  \n` : ""}${ Array.isArray(AURPackageInfo?.Provides)&& (AURPackageInfo?.Provides?.length) > 0 ? `**Provides:** ${AURPackageInfo.Provides.toString()}  \n` : ""}**Submitter:** ${AURPackageInfo?.Submitter}  \n**Maintainers:** ${AURPackage.Maintainer}${Array.isArray(AURPackageInfo.CoMaintainers)&&(AURPackageInfo.CoMaintainers?.length) >0 ? ` (${AURPackageInfo.CoMaintainers.toString()})` : ""}  \n**Votes:** ${AURPackage.NumVotes}  \n**Popularity:** ${AURPackage.Popularity}  \n**First Submitted:** ${new Date(AURPackage.FirstSubmitted * 1000).toLocaleString()}  \n**Last Updated:** ${new Date(AURPackage.LastModified * 1000).toLocaleString()} ${(typeof AURPackageInfo.OutOfDate === 'number') ? `  \n<span style="color:red">_**Flagged out-of-date**(${new Date(AURPackageInfo.OutOfDate * 1000).toLocaleDateString()})</span>_` : ""}`}/>
                } accessories={[
                    { tag: { value: "AUR", color: Color.Green}}
                ]} actions={
                    <ActionPanel>
                        <Action.RunInTerminal title="Install package" args={["/bin/bash","-c",`set -x;${[prefs["aur-helper"]]} -S --needed ${AURPackage.Name}`]} options={{hold:true}} />
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://aur.archlinux.org/packages/${AURPackage.Name}`} icon="Arch_Linux_logo.svg"/>
                        <Action.Push title="View PKGBUILD" target={ReadPKGBUILD(PKGBUILD)} icon={Icon.NewDocument}/>
                        <Action.Push title="View PKGBUILD changes" target={ReadPKGBUILDDiffs(PKGBUILDCommits)} icon={Icon.Clock}/>
                        <Action.CopyToClipboard title="Copy upstream url to clipboard" content={AURPackage.URL} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://aur.archlinux.org/packages/${AURPackage.Name}`}/>
                    </ActionPanel>
                }/>
                
            )}
            

                 </>   
            )
            
            }
        </List>
    );
}